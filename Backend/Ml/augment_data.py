"""
Expanded diverse dataset with comprehensive human student code vs AI generated code
across introductory programming, data structures, utilities, and math.
"""
import pandas as pd
from pathlib import Path

ADDITIONAL_DATA = [
    # --- Human Beginner & Intermediate Lab Samples ---
    ("h_sum_list", "numbers = [1, 2, 3, 4, 5]\ntotal = 0\nfor n in numbers:\n    total = total + n\nprint(total)", 0),
    ("h_area_circle", "import math\ndef get_circle_area(radius):\n    return math.pi * radius * radius", 0),
    ("h_celsius_to_fahr", "def c_to_f(c):\n    return (c * 9/5) + 32\ntemp = float(input('Enter temp in C: '))\nprint('In F:', c_to_f(temp))", 0),
    ("h_max_of_three", "def max_three(a, b, c):\n    if a >= b and a >= c:\n        return a\n    elif b >= a and b >= c:\n        return b\n    else:\n        return c", 0),
    ("h_count_vowels", "def get_vowel_count(s):\n    cnt = 0\n    for char in s.lower():\n        if char in 'aeiou':\n            cnt += 1\n    return cnt", 0),
    ("h_simple_calculator", "def calc(a, b, op):\n    if op == '+': return a + b\n    if op == '-': return a - b\n    if op == '*': return a * b\n    if op == '/': return a / b if b != 0 else 0", 0),
    ("h_multiplication_table", "n = int(input())\nfor i in range(1, 11):\n    print(f'{n} x {i} = {n*i}')", 0),
    ("h_even_odd", "def check_even(num):\n    if num % 2 == 0:\n        return 'Even'\n    return 'Odd'", 0),
    ("h_linear_search_simple", "def find_item(lst, val):\n    for i in range(len(lst)):\n        if lst[i] == val:\n            return i\n    return -1", 0),
    ("h_reverse_string", "def reverse_str(text):\n    return text[::-1]", 0),
    ("h_list_comprehension", "squares = [x * x for x in range(10) if x % 2 == 0]\nprint(squares)", 0),
    ("h_dict_frequency", "word = 'programming'\nfreq = {}\nfor ch in word:\n    freq[ch] = freq.get(ch, 0) + 1\nprint(freq)", 0),
    ("h_oop_car", "class Car:\n    def __init__(self, brand, year):\n        self.brand = brand\n        self.year = year\n    def drive(self):\n        print(self.brand, 'is driving')", 0),
    ("h_file_lines", "with open('file.txt') as f:\n    for line in f:\n        print(line.strip())", 0),
    ("h_min_element", "def find_min(arr):\n    m = arr[0]\n    for x in arr:\n        if x < m:\n            m = x\n    return m", 0),
    ("h_sum_digits", "def sum_digits(n):\n    s = 0\n    while n > 0:\n        s += n % 10\n        n //= 10\n    return s", 0),
    ("h_swap_vars", "def swap(a, b):\n    return b, a", 0),
    ("h_remove_duplicates", "def unique_elements(items):\n    res = []\n    for item in items:\n        if item not in res:\n            res.append(item)\n    return res", 0),
    ("h_read_integers", "nums = list(map(int, input().split()))\nprint(sum(nums))", 0),
    ("h_loop_break", "while True:\n    cmd = input('Enter cmd: ')\n    if cmd == 'exit':\n        break\n    print('Received:', cmd)", 0),

    # --- Modern AI (GPT-4o, Claude 3.5, Copilot) Coding Samples ---
    ("ai_circle_area", "import math\nfrom typing import Union\n\ndef calculate_circle_area(radius: Union[int, float]) -> float:\n    \"\"\"Calculate and return the area of a circle given its radius.\"\"\"\n    if radius < 0:\n        raise ValueError('Radius cannot be negative')\n    return math.pi * (radius ** 2)", 1),
    ("ai_celsius_converter", "def celsius_to_fahrenheit(celsius: float) -> float:\n    \"\"\"Convert temperature from Celsius to Fahrenheit scale.\"\"\"\n    return (celsius * 9.0 / 5.0) + 32.0", 1),
    ("ai_max_three", "def find_maximum_of_three(a: float, b: float, c: float) -> float:\n    \"\"\"Return the maximum among three numbers using max built-in.\"\"\"\n    return max(a, b, c)", 1),
    ("ai_count_vowels", "def count_vowels(input_string: str) -> int:\n    \"\"\"Count the total number of vowels present in the given string.\"\"\"\n    vowels = set('aeiouAEIOU')\n    return sum(1 for char in input_string if char in vowels)", 1),
    ("ai_simple_calculator", "from typing import Union\n\ndef perform_arithmetic_operation(operand_a: float, operand_b: float, operator: str) -> float:\n    \"\"\"Execute basic arithmetic operation based on provided operator.\"\"\"\n    operations = {\n        '+': lambda x, y: x + y,\n        '-': lambda x, y: x - y,\n        '*': lambda x, y: x * y,\n        '/': lambda x, y: x / y if y != 0 else float('nan'),\n    }\n    if operator not in operations:\n        raise ValueError(f'Unsupported operator: {operator}')\n    return operations[operator](operand_a, operand_b)", 1),
    ("ai_multiplication_table", "def generate_multiplication_table(number: int, limit: int = 10) -> list[str]:\n    \"\"\"Generate formatted multiplication table lines for a specified integer.\"\"\"\n    return [f'{number} x {i} = {number * i}' for i in range(1, limit + 1)]", 1),
    ("ai_even_odd", "def is_even_number(number: int) -> bool:\n    \"\"\"Check whether an integer is even.\"\"\"\n    return number % 2 == 0", 1),
    ("ai_linear_search", "from typing import Any, Sequence, Optional\n\ndef linear_search(sequence: Sequence[Any], target_item: Any) -> Optional[int]:\n    \"\"\"Search for target item in sequence and return its index if found.\"\"\"\n    for index, current_element in enumerate(sequence):\n        if current_element == target_item:\n            return index\n    return None", 1),
    ("ai_reverse_string", "def reverse_string(input_text: str) -> str:\n    \"\"\"Return the reversed representation of the input string.\"\"\"\n    return input_text[::-1]", 1),
    ("ai_dict_freq", "from collections import Counter\nfrom typing import Dict\n\ndef calculate_character_frequencies(text: str) -> Dict[str, int]:\n    \"\"\"Compute frequency distribution of characters in a string.\"\"\"\n    return dict(Counter(text))", 1),
    ("ai_oop_vehicle", "class Vehicle:\n    \"\"\"Represents a general vehicle with brand and production year.\"\"\"\n    def __init__(self, brand: str, manufacturing_year: int) -> None:\n        self.brand = brand\n        self.manufacturing_year = manufacturing_year\n\n    def drive(self) -> None:\n        print(f'{self.brand} is currently driving.')", 1),
    ("ai_sum_digits", "def sum_of_digits(number: int) -> int:\n    \"\"\"Calculate the sum of all digits of an integer.\"\"\"\n    return sum(int(digit) for digit in str(abs(number)))", 1),
    ("ai_remove_duplicates", "from typing import List, TypeVar\n\nT = TypeVar('T')\ndef remove_duplicates_preserving_order(elements: List[T]) -> List[T]:\n    \"\"\"Remove duplicate elements while maintaining their original order.\"\"\"\n    return list(dict.fromkeys(elements))", 1),
    ("ai_most_frequent", "from collections import Counter\nfrom typing import Any, List, Optional\n\ndef get_most_frequent_element(items: List[Any]) -> Optional[Any]:\n    \"\"\"Find and return the most commonly occurring element in the list.\"\"\"\n    if not items:\n        return None\n    return Counter(items).most_common(1)[0][0]", 1),
]

def append_additional_data():
    out_path = Path(__file__).parent / "dataset" / "university_benchmark_samples.csv"
    existing = pd.read_csv(out_path) if out_path.exists() else pd.DataFrame(columns=["problem_id", "code", "label"])
    new_df = pd.DataFrame(ADDITIONAL_DATA, columns=["problem_id", "code", "label"])
    combined = pd.concat([existing, new_df], ignore_index=True).drop_duplicates(subset=["code"])
    combined.to_csv(out_path, index=False)
    print(f"Total university & lab benchmark samples now: {len(combined)}")

if __name__ == "__main__":
    append_additional_data()
