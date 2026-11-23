from typing import Dict, Any
import datetime

class BankAccount:
    """
    Represents an institutional bank account with transaction integrity.
    """

    def __init__(self, account_holder: str, initial_balance: float = 0.0) -> None:
        if initial_balance < 0.0:
            raise ValueError("Initial balance cannot be negative.")
        self.account_holder: str = account_holder
        self._balance: float = initial_balance
        self._history: list[Dict[str, Any]] = []

    def deposit(self, amount: float) -> float:
        """Deposit funds into account."""
        if amount <= 0.0:
            raise ValueError("Deposit amount must be strictly positive.")
        self._balance += amount
        self._history.append({"type": "DEPOSIT", "amount": amount, "timestamp": datetime.datetime.now().isoformat()})
        return self._balance

    def withdraw(self, amount: float) -> float:
        """Withdraw funds from account with insufficient balance check."""
        if amount <= 0.0:
            raise ValueError("Withdrawal amount must be strictly positive.")
        if amount > self._balance:
            raise ValueError("Insufficient funds for requested transaction.")
        self._balance -= amount
        self._history.append({"type": "WITHDRAWAL", "amount": amount, "timestamp": datetime.datetime.now().isoformat()})
        return self._balance

    @property
    def current_balance(self) -> float:
        return self._balance
