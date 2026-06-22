import re
import numpy as np

_URGENCY_WORDS = [
    'urgent', 'critical', 'down', 'outage', 'crash', 'asap', 'immediately',
    'not working', 'broken', 'failed', 'error', 'cannot', "can't", "won't",
    'blocked', 'emergency', 'severe', 'unresponsive', 'corrupted',
]

_SCOPE_WORDS = [
    'entire team', 'all users', 'company-wide', 'everyone', 'all staff',
    'whole department', 'multiple users', 'all employees', 'organization',
    'whole office', 'entire office',
]

_TIME_WORDS = [
    'deadline', 'presentation', 'client', 'meeting', 'due today', 'by today',
    'end of day', 'eod', 'by tomorrow', 'immediately', 'right now',
]

# All words/phrases that signal negative tone.
# Combines what were previously "frustration" and "high urgency" into one
# unified list so both patterns (synthetic: "urgently/ASAP" and real-world:
# "escalated/unacceptable") map to the same feature dimension.
_NEG_SIGNALS = [
    # Explicit urgency (present in synthetic training data)
    'urgent', 'asap', 'immediately', 'emergency',
    'still not working', 'still having', 'affecting my work',
    'entire team', 'all users', 'cannot work', 'blocking',
    'need this fixed', 'for 2 days', 'for 3 days',
    'since yesterday', 'second time', 'third time', 'multiple times',
    # Frustration language (more common in real-world tickets)
    'still', 'again', 'already', 'waiting', 'escalate', 'unacceptable',
    'terrible', 'horrible', 'awful', 'frustrated', 'useless',
    'ridiculous', 'disappointed', 'ignored', 'no response', 'getting worse',
]

# Polite/appreciative language
_POSITIVE_WORDS = [
    'thank you', 'thanks', 'appreciate', 'grateful', 'helpful',
    'resolved', 'excellent', 'great',
]

# Low-urgency phrases — the key signal for Satisfied tone.
# Mirrors _POS_HIGH in relabel_sentiment.py exactly.
_LOW_URGENCY_PHRASES = [
    'not urgent', 'when you get a chance', 'at your convenience',
    'whenever you have time', 'no rush', 'take your time',
    'not a priority', 'low priority', 'at your earliest convenience',
    'when possible', 'when available', 'if possible',
]


def extract_priority_features(texts: list) -> np.ndarray:
    """
    Hand-crafted urgency features for priority classification.
    Captures scope, urgency language, and time pressure that embeddings
    alone can miss when two tickets share the same category.
    """
    features = []
    for text in texts:
        t = text.lower()
        row = [
            sum(1 for kw in _URGENCY_WORDS if kw in t),
            sum(1 for kw in _SCOPE_WORDS if kw in t),
            sum(1 for kw in _TIME_WORDS if kw in t),
            len(text.split()),
            len(re.findall(r'!', text)),
            1 if re.search(r"\b(can't|won't|doesn't|didn't|not|unable|failed)\b", t) else 0,
            1 if re.search(r'\b(everyone|all users|team|company|whole)\b', t) else 0,
            sum(1 for c in text if c.isupper()) / max(len(text), 1),
        ]
        features.append(row)
    return np.array(features, dtype=np.float32)


def extract_sentiment_features(texts: list) -> np.ndarray:
    """
    ITSM-specific affect features for sentiment classification.
    All negative signals (urgency + frustration) are combined into one
    score so both synthetic-data patterns and real-world patterns map
    to the same feature dimension the classifier learns from.
    """
    features = []
    for text in texts:
        t = text.lower()
        row = [
            sum(1 for kw in _NEG_SIGNALS if kw in t),         # combined negative signal
            sum(1 for kw in _POSITIVE_WORDS if kw in t),       # polite / appreciative
            sum(1 for kw in _LOW_URGENCY_PHRASES if kw in t),  # "no rush / not urgent"
            len(re.findall(r'!', text)),                        # shouting
            len(re.findall(r'\?', text)),                       # questioning
            sum(1 for c in text if c.isupper()) / max(len(text), 1),  # caps ratio
        ]
        features.append(row)
    return np.array(features, dtype=np.float32)
