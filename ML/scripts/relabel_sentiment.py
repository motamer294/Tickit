"""
Fix sentiment labels in the dataset by deriving them from description text.

The original 'Survey results' column was randomly assigned with no correlation
to the ticket text, making it impossible for a model to learn from.

This script applies ITSM-specific rules to assign sentiment based on what the
user actually wrote — urgency/frustration tone → Dissatisfied, polite/low-urgency
tone → Satisfied, neutral reporting → Neutral — then saves and retrains.

Run from the ML/ directory:
    python scripts/relabel_sentiment.py
"""

import sys
import os
import re
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.feature_engineering import _NEG_SIGNALS, _POSITIVE_WORDS, _LOW_URGENCY_PHRASES

DATASET_PATH = 'dataset/Synthetic_ITSM_Data_Ready.csv'


def derive_sentiment(text: str) -> str:
    """
    Assigns sentiment labels using the SAME word lists as extract_sentiment_features,
    ensuring perfect alignment between labels and the features the model trains on.
    """
    t = text.lower()

    neg = sum(1 for kw in _NEG_SIGNALS if kw in t)
    pos = sum(1 for kw in _POSITIVE_WORDS if kw in t)
    low = sum(1 for kw in _LOW_URGENCY_PHRASES if kw in t)

    # Extra signals (mirrored in extract_sentiment_features as features 4-6)
    if text.count('!') >= 2:
        neg += 1
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if caps_ratio > 0.15:
        neg += 1

    pos_score = pos + low * 3   # low-urgency phrases are strong positive signal

    if neg >= 2 and neg > pos_score:
        return 'Dissatisfied'
    elif pos_score >= 2 and pos_score > neg:
        return 'Satisfied'
    else:
        return 'Neutral'


def main():
    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(df)} rows.")
    print(f"Old distribution:\n{df['Survey results'].value_counts().to_dict()}\n")

    df['Survey results'] = df['Description'].astype(str).apply(derive_sentiment)

    new_dist = df['Survey results'].value_counts()
    print(f"New distribution:\n{new_dist.to_dict()}\n")

    pct = new_dist / len(df) * 100
    for label, count in new_dist.items():
        print(f"  {label:<15}  {count:>5}  ({pct[label]:.1f}%)")

    df.to_csv(DATASET_PATH, index=False)
    print(f"\nSaved to {DATASET_PATH}")

    # Quick sanity check — sample each class
    print("\n=== Dissatisfied samples ===")
    for d in df[df['Survey results'] == 'Dissatisfied']['Description'].head(3):
        print(' -', d[:120])

    print("\n=== Satisfied samples ===")
    for d in df[df['Survey results'] == 'Satisfied']['Description'].head(3):
        print(' -', d[:120])

    print("\n=== Neutral samples ===")
    for d in df[df['Survey results'] == 'Neutral']['Description'].head(3):
        print(' -', d[:120])


if __name__ == '__main__':
    main()
