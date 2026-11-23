#!/usr/bin/env python3
"""
Interactive & Benchmark Tester for the Codexa AI Code Detector.

Usage:
  1. Run full benchmark suite:
     python test_detector_cli.py --benchmark

  2. Test a single snippet interactively or from a file:
     python test_detector_cli.py --code "def add(a, b): return a + b"
     python test_detector_cli.py --file path/to/student_code.py

  3. Enter interactive REPL mode:
     python test_detector_cli.py --interactive
"""
import sys
import argparse
from pathlib import Path

# Add Backend to python path
BACKEND_DIR = Path(__file__).resolve().parent / "Backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from Ml.code_detector import analyze_code, is_model_loaded

BENCHMARK_SUITE = [
    # Human student samples
    ("Human: Simple Factorial", 0, "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)"),
    ("Human: Bubble Sort", 0, "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr"),
    ("Human: Student Class (OOP)", 0, "class Student:\n    def __init__(self, name, roll_no):\n        self.name = name\n        self.roll_no = roll_no\n    def display(self):\n        print(f\"Student: {self.name}, Roll: {self.roll_no}\")"),
    ("Human: Loop Accumulator", 0, "sum_val = 0\nfor x in [1, 2, 3, 4, 5]:\n    sum_val += x\nprint(sum_val)"),
    ("Human: File Reader", 0, "with open(\"data.txt\", \"r\") as f:\n    data = f.read()\nprint(len(data.split()))"),
    ("Human: Palindrome Check", 0, "def is_palindrome(s):\n    cleaned = s.lower().replace(\" \", \"\")\n    return cleaned == cleaned[::-1]"),
    ("Human: Average Loop", 0, "total = 0\ncount = 0\nwhile True:\n    val = input(\"Enter number or done: \")\n    if val == \"done\":\n        break\n    total += float(val)\n    count += 1\nprint(\"Average:\", total / count if count else 0)"),
    ("Human: Fibonacci Sequence", 0, "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=\" \")\n        a, b = b, a + b\n    print()"),
    ("Human: Circle Area", 0, "import math\ndef area_circle(r):\n    return math.pi * r * r"),
    ("Human: Input Split & Max", 0, "numbers = [int(x) for x in input().split()]\nprint(max(numbers), min(numbers))"),

    # Modern AI (ChatGPT-4o / Claude 3.5 / Copilot style)
    ("AI: Factorial with Validation", 1, "def calculate_factorial(number: int) -> int:\n    \"\"\"Calculate the factorial of a non-negative integer.\"\"\"\n    if number < 0:\n        raise ValueError(\"Factorial is not defined for negative numbers.\")\n    if number in (0, 1):\n        return 1\n    result = 1\n    for i in range(2, number + 1):\n        result *= i\n    return result"),
    ("AI: Typed Binary Search", 1, "from typing import List\n\ndef binary_search(array: List[int], target: int) -> int:\n    \"\"\"Perform binary search to find target element index in sorted array.\"\"\"\n    low = 0\n    high = len(array) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if array[mid] == target:\n            return mid\n        elif array[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1"),
    ("AI: BankAccount OOP", 1, "class BankAccount:\n    \"\"\"Represents a simple bank account with deposit and withdraw capabilities.\"\"\"\n    def __init__(self, owner: str, balance: float = 0.0) -> None:\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount: float) -> None:\n        if amount <= 0:\n            raise ValueError(\"Deposit amount must be positive\")\n        self.balance += amount\n\n    def withdraw(self, amount: float) -> None:\n        if amount > self.balance:\n            raise ValueError(\"Insufficient funds\")\n        self.balance -= amount"),
    ("AI: Regex Email Validator", 1, "import re\n\ndef validate_email_address(email: str) -> bool:\n    \"\"\"Validate standard email format using regex.\"\"\"\n    pattern = r\"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$\"\n    return bool(re.match(pattern, email))"),
    ("AI: Dictionary Merger", 1, "def merge_dictionaries(dict1: dict, dict2: dict) -> dict:\n    \"\"\"Merge two dictionaries, giving precedence to dict2.\"\"\"\n    merged = dict1.copy()\n    merged.update(dict2)\n    return merged"),
    ("AI: JSON Config Parser", 1, "import json\n\ndef parse_user_config(config_path: str) -> dict:\n    \"\"\"Load and parse JSON user configuration file safely.\"\"\"\n    try:\n        with open(config_path, \"r\", encoding=\"utf-8\") as file:\n            return json.load(file)\n    except FileNotFoundError:\n        return {}\n    except json.JSONDecodeError as err:\n        raise ValueError(f\"Invalid JSON: {err}\")"),
    ("AI: Word Order Reverser", 1, "def reverse_words_in_string(sentence: str) -> str:\n    \"\"\"Reverses each word in the provided string maintaining word order.\"\"\"\n    words = sentence.split(\" \")\n    reversed_words = [word[::-1] for word in words]\n    return \" \".join(reversed_words)"),
    ("AI: Set Duplicate Finder", 1, "def find_duplicates(numbers: list[int]) -> list[int]:\n    \"\"\"Return all duplicate integers present in the input list.\"\"\"\n    seen = set()\n    duplicates = set()\n    for num in numbers:\n        if num in seen:\n            duplicates.add(num)\n        else:\n            seen.add(num)\n    return sorted(list(duplicates))"),
    ("AI: Counter Most Frequent", 1, "from collections import Counter\n\ndef most_frequent_element(items: list) -> any:\n    \"\"\"Returns the most common element in the list.\"\"\"\n    if not items:\n        return None\n    counts = Counter(items)\n    return counts.most_common(1)[0][0]"),
    ("AI: Recursive List Flatten", 1, "def flatten_nested_list(nested_list: list) -> list:\n    \"\"\"Recursively flatten a deeply nested list into a flat list.\"\"\"\n    flat = []\n    for item in nested_list:\n        if isinstance(item, list):\n            flat.extend(flatten_nested_list(item))\n        else:\n            flat.append(item)\n    return flat"),
]


def print_result(code_snippet: str, title: str = "Analysis Result"):
    res = analyze_code(code_snippet)
    print("\n" + "=" * 50)
    print(f" {title} ")
    print("=" * 50)
    print(f"Predicted Label : {res['aiLabel']}")
    print(f"Confidence      : {res['aiConfidence'] * 100:.2f}%")
    print(f"Human Probability: {res['humanPercentage']:.2f}%")
    print(f"AI Probability   : {res['aiPercentage']:.2f}%")
    print("=" * 50)


def run_benchmark():
    print("\nRunning Codexa Model Benchmark Suite (20 Real-World Tests)...")
    print("-" * 75)
    print(f"{'Test Name':<30} | {'Actual':<7} | {'Predicted':<7} | {'Status':<6} | {'Confidence'}")
    print("-" * 75)

    matches = 0
    total = len(BENCHMARK_SUITE)
    false_positives = 0
    true_positives = 0

    for name, expected_label, code in BENCHMARK_SUITE:
        res = analyze_code(code)
        pred_label = 1 if res["aiLabel"] == "AI" else 0
        is_match = pred_label == expected_label
        if is_match:
            matches += 1

        if expected_label == 0 and pred_label == 1:
            false_positives += 1
        if expected_label == 1 and pred_label == 1:
            true_positives += 1

        expected_str = "AI" if expected_label == 1 else "Human"
        status_str = "PASS" if is_match else "FAIL"
        print(f"{name:<30} | {expected_str:<7} | {res['aiLabel']:<7} | {status_str:<6} | {res['aiConfidence']*100:.1f}%")

    print("-" * 75)
    accuracy = (matches / total) * 100
    print(f"Overall Accuracy      : {accuracy:.1f}% ({matches}/{total} passed)")
    print(f"False Positive Rate   : {(false_positives / 10) * 100:.1f}% (Innocent students accused)")
    print(f"AI Detection Recall   : {(true_positives / 10) * 100:.1f}%")
    print("=" * 75 + "\n")


def interactive_mode():
    print("\nEntering Codexa Interactive Tester (Type 'exit' or Ctrl+C to quit)")
    print("Paste your code snippet below. Enter an empty line or 'END' when finished:\n")
    while True:
        try:
            lines = []
            while True:
                line = input()
                if line.strip() == "END":
                    break
                lines.append(line)
                if not line.strip() and len(lines) > 1 and not lines[-2].strip():
                    break
            code = "\n".join(lines).strip()
            if code == "exit":
                break
            if not code:
                continue
            print_result(code)
            print("\nEnter another snippet (or 'exit' to quit):")
        except (KeyboardInterrupt, EOFError):
            print("\nExiting interactive tester.")
            break


def main():
    parser = argparse.ArgumentParser(description="Codexa AI Code Detector CLI Tester")
    parser.add_argument("--benchmark", action="store_true", help="Run the automated 20-sample real-world benchmark suite")
    parser.add_argument("--code", type=str, help="Python code string to test directly")
    parser.add_argument("--file", type=str, help="Path to a Python file to test")
    parser.add_argument("--interactive", action="store_true", help="Run in interactive REPL mode")

    args = parser.parse_args()

    if not is_model_loaded():
        print("Error: Could not load model or transformers from Backend/Ml/models!")
        sys.exit(1)

    if args.benchmark:
        run_benchmark()
    elif args.code:
        print_result(args.code, "Code String Analysis")
    elif args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"Error: File not found at {file_path}")
            sys.exit(1)
        code = file_path.read_text(encoding="utf-8")
        print_result(code, f"File Analysis: {file_path.name}")
    elif args.interactive:
        interactive_mode()
    else:
        # Default to benchmark if no args provided
        run_benchmark()


if __name__ == "__main__":
    main()
