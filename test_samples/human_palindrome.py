def is_palindrome(s):
    cleaned = s.lower().replace(" ", "")
    return cleaned == cleaned[::-1]

def count_vowels(text):
    cnt = 0
    for ch in text.lower():
        if ch in "aeiou":
            cnt += 1
    return cnt

user_str = input("Enter text: ")
if is_palindrome(user_str):
    print("It is a palindrome!")
else:
    print("Not a palindrome.")
print("Total vowels:", count_vowels(user_str))
