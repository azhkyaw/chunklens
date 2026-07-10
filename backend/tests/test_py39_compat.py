from __future__ import annotations

import ast
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "src" / "chunklens"


def _pep604_unions_in_annotations(path: Path) -> list[str]:
    """Find `X | Y` unions used inside type annotations of one source file.

    `from __future__ import annotations` makes them parse on 3.9, but FastAPI
    (route registration) and Pydantic (model creation) evaluate annotations at
    import time, and `type.__or__` does not exist until Python 3.10, so any
    PEP 604 union in an annotation crashes app startup on 3.9.
    """
    tree = ast.parse(path.read_text(encoding="utf-8"))
    annotations: list[ast.expr] = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = node.args
            for arg in [*args.posonlyargs, *args.args, *args.kwonlyargs, args.vararg, args.kwarg]:
                if arg is not None and arg.annotation is not None:
                    annotations.append(arg.annotation)
            if node.returns is not None:
                annotations.append(node.returns)
        elif isinstance(node, ast.AnnAssign):
            annotations.append(node.annotation)
    violations = []
    for ann in annotations:
        for sub in ast.walk(ann):
            if isinstance(sub, ast.BinOp) and isinstance(sub.op, ast.BitOr):
                violations.append(f"{path.relative_to(SRC)}:{sub.lineno}: {ast.unparse(sub)}")
    return violations


def test_no_pep604_unions_in_annotations():
    violations = []
    for path in sorted(SRC.rglob("*.py")):
        violations.extend(_pep604_unions_in_annotations(path))
    assert violations == [], (
        "PEP 604 unions in annotations break Python 3.9 at import time; "
        "use Optional[...] / Union[...] instead:\n" + "\n".join(violations)
    )
