import ast
import io
import tokenize
import pandas as pd


def strip_comments_and_docstrings(source: str) -> str:
    """
    Remove comments and docstrings from Python source code so the model
    evaluates underlying code semantics and structure rather than English comments.
    """
    try:
        io_obj = io.StringIO(source)
        out = ""
        prev_toktype = tokenize.INDENT
        last_lineno = -1
        last_col = 0
        tokgen = tokenize.generate_tokens(io_obj.readline)
        for tok_type, tok_string, (sline, scol), (eline, ecol), _ in tokgen:
            if sline > last_lineno:
                last_col = 0
            if scol > last_col:
                out += " " * (scol - last_col)
            if tok_type == tokenize.COMMENT:
                pass
            elif tok_type == tokenize.STRING:
                if prev_toktype != tokenize.INDENT and prev_toktype != tokenize.NEWLINE and last_col > 0:
                    out += tok_string
            else:
                out += tok_string
            prev_toktype = tok_type
            last_lineno = eline
            last_col = ecol
        return out
    except Exception:
        cleaned = []
        for line in source.split("\n"):
            stripped = line.strip()
            if not stripped.startswith("#"):
                cleaned.append(line)
        return "\n".join(cleaned)


def extract_features(code: str) -> pd.Series:
    """
    Extract high-precision AST structural, stylistic, and semantic features
    specifically designed to distinguish modern AI generation patterns from human students.
    """
    lines = code.split("\n")
    total_lines = max(len(lines), 1)
    non_blank_lines = [l for l in lines if l.strip()]
    num_non_blank = max(len(non_blank_lines), 1)

    # 1. Surface and Formatting Metrics
    blank_lines = sum(1 for l in lines if not l.strip())
    comment_lines = sum(1 for l in lines if l.strip().startswith("#"))
    avg_line_len = sum(len(l) for l in lines) / total_lines
    max_line_len = max((len(l) for l in lines), default=0)
    total_indentation = sum(len(l) - len(l.lstrip()) for l in lines)
    avg_indentation = total_indentation / num_non_blank

    # 2. AST parsing & Structural metrics
    syntax_valid = 1.0
    ast_depth = 0
    num_ast_nodes = 0
    num_functions = 0
    num_classes = 0
    num_returns = 0
    num_loops = 0
    num_branches = 0
    num_type_hints = 0
    num_docstrings = 0
    num_list_comps = 0
    num_dict_comps = 0
    num_lambda = 0
    num_try_except = 0
    num_raises = 0
    num_asserts = 0
    num_with_stmts = 0
    has_typing_import = 0.0
    identifier_lengths = []
    single_char_ids = 0
    snake_case_multiword_ids = 0

    try:
        tree = ast.parse(code)
        all_nodes = list(ast.walk(tree))
        num_ast_nodes = len(all_nodes)

        def get_depth(node):
            children = list(ast.iter_child_nodes(node))
            if not children:
                return 1
            return 1 + max(get_depth(c) for c in children)

        ast_depth = get_depth(tree)

        for node in all_nodes:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                num_functions += 1
                if ast.get_docstring(node):
                    num_docstrings += 1
                if node.returns is not None:
                    num_type_hints += 1
                for arg in node.args.args:
                    if arg.annotation is not None:
                        num_type_hints += 1

            elif isinstance(node, ast.ClassDef):
                num_classes += 1
                if ast.get_docstring(node):
                    num_docstrings += 1

            elif isinstance(node, ast.Return):
                num_returns += 1

            elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
                num_loops += 1

            elif isinstance(node, (ast.If, ast.IfExp)):
                num_branches += 1

            elif isinstance(node, ast.ListComp):
                num_list_comps += 1

            elif isinstance(node, (ast.DictComp, ast.SetComp)):
                num_dict_comps += 1

            elif isinstance(node, ast.Lambda):
                num_lambda += 1

            elif isinstance(node, ast.Try):
                num_try_except += 1

            elif isinstance(node, ast.Raise):
                num_raises += 1

            elif isinstance(node, ast.Assert):
                num_asserts += 1

            elif isinstance(node, ast.With):
                num_with_stmts += 1

            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in ("typing", "collections", "itertools", "dataclasses"):
                        has_typing_import = 1.0

            elif isinstance(node, ast.ImportFrom):
                if node.module in ("typing", "collections", "itertools", "dataclasses"):
                    has_typing_import = 1.0

            elif isinstance(node, ast.Name):
                id_name = node.id
                identifier_lengths.append(len(id_name))
                if len(id_name) == 1:
                    single_char_ids += 1
                if "_" in id_name and len(id_name) > 3:
                    snake_case_multiword_ids += 1

    except Exception:
        syntax_valid = 0.0
        num_ast_nodes = total_lines * 3
        ast_depth = 3

    total_ids = max(len(identifier_lengths), 1)
    avg_id_len = sum(identifier_lengths) / total_ids
    max_id_len = max(identifier_lengths, default=0)
    single_char_ratio = single_char_ids / total_ids
    multiword_ratio = snake_case_multiword_ids / total_ids

    ast_nodes_per_line = num_ast_nodes / num_non_blank
    branch_density = num_branches / num_non_blank
    loop_density = num_loops / num_non_blank
    comprehension_count = num_list_comps + num_dict_comps

    return pd.Series({
        "syntax_valid": float(syntax_valid),
        "total_lines": float(total_lines),
        "blank_ratio": float(blank_lines / total_lines),
        "comment_ratio": float(comment_lines / total_lines),
        "avg_line_len": float(avg_line_len),
        "max_line_len": float(max_line_len),
        "avg_indentation": float(avg_indentation),
        "ast_depth": float(ast_depth),
        "num_ast_nodes": float(num_ast_nodes),
        "ast_nodes_per_line": float(ast_nodes_per_line),
        "num_functions": float(num_functions),
        "num_classes": float(num_classes),
        "num_returns": float(num_returns),
        "loop_density": float(loop_density),
        "branch_density": float(branch_density),
        "type_hint_density": float(num_type_hints / max(num_functions, 1)),
        "has_type_hints": float(1.0 if num_type_hints > 0 else 0.0),
        "docstring_density": float(num_docstrings / max(num_functions + num_classes, 1)),
        "comprehension_count": float(comprehension_count),
        "num_lambda": float(num_lambda),
        "num_try_except": float(num_try_except),
        "num_raises": float(num_raises),
        "num_asserts": float(num_asserts),
        "num_with_stmts": float(num_with_stmts),
        "has_typing_import": float(has_typing_import),
        "avg_id_len": float(avg_id_len),
        "max_id_len": float(max_id_len),
        "single_char_ratio": float(single_char_ratio),
        "multiword_ratio": float(multiword_ratio),
    })
