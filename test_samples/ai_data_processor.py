from typing import List, TypeVar, Set
from collections import Counter

T = TypeVar("T")

def remove_duplicates_ordered(items: List[T]) -> List[T]:
    """
    Remove duplicate items from sequence preserving original order.
    """
    seen: Set[T] = set()
    unique_items: List[T] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            unique_items.append(item)
    return unique_items

def get_frequency_distribution(elements: List[str]) -> Dict[str, int]:
    """
    Compute occurrence count of distinct string tokens using Counter.
    """
    return dict(Counter(elements))

if __name__ == "__main__":
    sample_data: List[str] = ["apple", "banana", "apple", "orange", "banana", "apple"]
    print("Unique items:", remove_duplicates_ordered(sample_data))
