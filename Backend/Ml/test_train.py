import tempfile
import unittest
from pathlib import Path

import pandas as pd

from train import load_dataset, select_c_with_one_standard_error


class DatasetLoadingTests(unittest.TestCase):
    def test_excludes_code_with_conflicting_labels(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            dataset_directory = Path(temporary_directory)
            pd.DataFrame([
                {"problem_id": "p1", "code": "shared", "label": 0},
                {"problem_id": "p2", "code": "human", "label": 0},
            ]).to_csv(dataset_directory / "human_selected_dataset.csv", index=False)
            pd.DataFrame([
                {
                    "problem_id": "p1",
                    "status_in_folder": "Generate",
                    "code": "shared",
                    "label": 1,
                },
                {
                    "problem_id": "p3",
                    "status_in_folder": "Generate",
                    "code": "ai",
                    "label": 1,
                },
                {
                    "problem_id": "p4",
                    "status_in_folder": "Wrong",
                    "code": "excluded",
                    "label": 1,
                },
            ]).to_csv(
                dataset_directory / "created_dataset_with_llms.csv",
                index=False,
            )

            dataset = load_dataset(dataset_directory)

        self.assertEqual(set(dataset["code"]), {"human", "ai"})
        self.assertEqual(set(dataset["label"]), {0, 1})


class RegularizationSelectionTests(unittest.TestCase):
    def test_one_standard_error_rule_prefers_stronger_regularization(self):
        fold_scores_by_c = {
            0.03: [
                {"balanced_accuracy": 0.87, "macro_f1": 0.84},
                {"balanced_accuracy": 0.87, "macro_f1": 0.84},
                {"balanced_accuracy": 0.87, "macro_f1": 0.84},
            ],
            0.1: [
                {"balanced_accuracy": 0.895, "macro_f1": 0.87},
                {"balanced_accuracy": 0.895, "macro_f1": 0.87},
                {"balanced_accuracy": 0.895, "macro_f1": 0.87},
            ],
            0.3: [
                {"balanced_accuracy": 0.90, "macro_f1": 0.88},
                {"balanced_accuracy": 0.89, "macro_f1": 0.87},
                {"balanced_accuracy": 0.91, "macro_f1": 0.89},
            ],
        }

        selected_c, best_mean, threshold = select_c_with_one_standard_error(
            fold_scores_by_c
        )

        self.assertEqual(selected_c, 0.1)
        self.assertAlmostEqual(best_mean, 0.9)
        self.assertGreaterEqual(0.895, threshold)
        self.assertLess(0.87, threshold)


if __name__ == "__main__":
    unittest.main()
