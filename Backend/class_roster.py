def _normalized_emails(values):
    if not isinstance(values, list):
        return []
    return [
        email.strip().lower()
        for email in values
        if isinstance(email, str) and email.strip()
    ]


def enrolled_class_student_emails(class_record):
    return list(dict.fromkeys(_normalized_emails(class_record.get("student_emails"))))


def class_student_emails(class_record):
    return list(dict.fromkeys(
        enrolled_class_student_emails(class_record)
        + _normalized_emails(class_record.get("invited_emails"))
    ))
