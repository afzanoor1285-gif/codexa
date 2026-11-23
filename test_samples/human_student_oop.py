class Student:
    def __init__(self, name, roll_no):
        self.name = name
        self.roll_no = roll_no
        self.marks = []

    def add_mark(self, mark):
        self.marks.append(mark)

    def calculate_average(self):
        if len(self.marks) == 0:
            return 0
        return sum(self.marks) / len(self.marks)

    def display_info(self):
        print("Student:", self.name, "Roll:", self.roll_no, "Avg:", self.calculate_average())

if __name__ == "__main__":
    s = Student("John Doe", 101)
    s.add_mark(85)
    s.add_mark(90)
    s.display_info()
