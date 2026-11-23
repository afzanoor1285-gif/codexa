from typing import List, Optional

def binary_search(array: List[int], target: int) -> Optional[int]:
    """
    Perform binary search on a sorted integer list to locate the target value.

    Args:
        array (List[int]): Monotonically increasing list of integers.
        target (int): Target element to locate.

    Returns:
        Optional[int]: Zero-based index of target if found, otherwise None.
    """
    low: int = 0
    high: int = len(array) - 1

    while low <= high:
        mid: int = (low + high) // 2
        mid_val: int = array[mid]

        if mid_val == target:
            return mid
        elif mid_val < target:
            low = mid + 1
        else:
            high = mid - 1

    return None

if __name__ == "__main__":
    nums: List[int] = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
    result: Optional[int] = binary_search(nums, 23)
    print(f"Target found at index: {result}")
