import unittest

from class_roster import class_student_emails, enrolled_class_student_emails


class ClassRosterTests(unittest.TestCase):
    def test_includes_invited_and_enrolled_emails_only_once(self):
        class_record = {
            "student_emails": ["student@example.com", "Shared@example.com"],
            "invited_emails": ["shared@example.com", " invited@example.com "],
        }

        self.assertEqual(
            class_student_emails(class_record),
            ["student@example.com", "shared@example.com", "invited@example.com"],
        )
        self.assertEqual(
            enrolled_class_student_emails(class_record),
            ["student@example.com", "shared@example.com"],
        )

    def test_ignores_invalid_email_list_entries(self):
        self.assertEqual(
            class_student_emails({
                "student_emails": ["student@example.com", None, ""],
                "invited_emails": "not-a-list",
            }),
            ["student@example.com"],
        )


if __name__ == "__main__":
    unittest.main()
