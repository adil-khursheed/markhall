"""Helpers exposed to every sandbox script.

The runner executes the student/agent script with this module's namespace, so
scripts can use SymPy names plus the helpers below without importing anything.
"""

import json
import re as _re

from sympy import *
from sympy.geometry import Circle, Line, Point, Polygon, Triangle

DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

WESTERN_GROUPED = _re.compile(r"\b\d{1,3}(?:,\d{3})+\b")
INDIAN_GROUPED = _re.compile(r"\b\d{1,2}(?:,\d{2})*,\d{3}\b")

DEFAULT_RULES = {"pi": "exact", "rounding": 2}


def normalize(text):
    """Convert Devanagari digits and Indian/western digit grouping to plain ASCII."""
    text = str(text).translate(DEVANAGARI_DIGITS)
    text = INDIAN_GROUPED.sub(lambda m: m.group(0).replace(",", ""), text)
    return WESTERN_GROUPED.sub(lambda m: m.group(0).replace(",", ""), text)


def num(value):
    """Best-effort float for a SymPy value; None when it has no numeric form."""
    try:
        result = float(N(value, 15))
    except (TypeError, ValueError):
        return None
    return result if result == result and abs(result) != float("inf") else None


def latex_of(value):
    return latex(value)


def answer(**values):
    """Print the solver convention: one JSON object of named {latex, num} values."""
    payload = {key: {"latex": latex_of(value), "num": num(value)} for key, value in values.items()}
    print(json.dumps(payload, sort_keys=True))


def roots_of(expr, symbol):
    """Unique exact roots of expr == 0, sorted by numeric value."""
    return sorted(solve(Eq(expr, 0), symbol), key=lambda root: (num(root) is None, num(root)))


def _round(value, digits):
    return Float(value, digits + 2).round(digits)


def round_to(value, digits=DEFAULT_RULES["rounding"]):
    """Round to the board rounding convention (or an explicit digit count)."""
    return _round(value, digits)


def approx(a, b, tolerance=1e-9):
    """Numerical tolerance check used by verification nodes."""
    left, right = num(a), num(b)
    if left is None or right is None:
        return simplify(a - b) == 0
    return abs(left - right) <= tolerance


def distance(point_a, point_b):
    return Point(point_a).distance(Point(point_b))


def namespace(rules=None):
    rules = {**DEFAULT_RULES, **(rules or {})}
    convention = str(rules.get("pi", "exact"))
    pi_value = pi if convention == "exact" else sympify(convention)

    space = {name: value for name, value in globals().items() if not name.startswith("_")}
    rounding = int(rules.get("rounding", 2))
    space.update(
        PI=pi_value,
        ROUNDING=rounding,
        round_to=lambda value, digits=None: _round(value, rounding if digits is None else digits),
    )
    return space
