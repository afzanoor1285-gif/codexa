import re

import pandas as pd


def extract_features(code):
    lines = code.split("\n")

    return pd.Series({
        "num_lines": len(lines),
        "blank_lines": sum(1 for line in lines if line.strip() == ""),
        "comment_lines": sum(1 for line in lines if line.strip().startswith("#")),
        "imports": len(re.findall(r"\bimport\b", code)),
        "from_imports": len(re.findall(r"\bfrom\b", code)),
        "defs": len(re.findall(r"\bdef\b", code)),
        "classes": len(re.findall(r"\bclass\b", code)),
        "returns": len(re.findall(r"\breturn\b", code)),
        "fors": len(re.findall(r"\bfor\b", code)),
        "whiles": len(re.findall(r"\bwhile\b", code)),
        "ifs": len(re.findall(r"\bif\b", code)),
        "elses": len(re.findall(r"\belse\b", code)),
        "trys": len(re.findall(r"\btry\b", code)),
        "excepts": len(re.findall(r"\bexcept\b", code)),
        "avg_line_length": sum(len(line) for line in lines) / len(lines),
        "indentation": sum(len(line) - len(line.lstrip()) for line in lines),
    })
