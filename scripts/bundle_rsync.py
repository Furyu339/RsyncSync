from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path


_OTOOL_DEP_RE = re.compile(r"^\s+(\S+)\s+\(compatibility version")


def _run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True)


def _otool_deps(path: Path) -> list[str]:
    out = _run(["otool", "-L", str(path)])
    deps: list[str] = []
    for line in out.splitlines()[1:]:
        m = _OTOOL_DEP_RE.match(line)
        if m:
            deps.append(m.group(1))
    return deps


def _is_homebrew_path(p: str) -> bool:
    return p.startswith("/opt/homebrew/")


def _copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def _install_name_tool_change(target: Path, old: str, new: str) -> None:
    subprocess.check_call(["install_name_tool", "-change", old, new, str(target)])


def _install_name_tool_id(target: Path, new_id: str) -> None:
    subprocess.check_call(["install_name_tool", "-id", new_id, str(target)])


def bundle(rsync_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    bin_path = out_dir / "rsync"
    lib_dir = out_dir / "lib"
    lib_dir.mkdir(parents=True, exist_ok=True)

    _copy_file(rsync_path, bin_path)
    bin_path.chmod(0o755)

    queue: list[Path] = [bin_path]
    copied: dict[str, Path] = {}

    while queue:
        target = queue.pop()
        for dep in _otool_deps(target):
            if not _is_homebrew_path(dep):
                continue
            real = Path(os.path.realpath(dep))
            name = real.name
            if name not in copied:
                dst = lib_dir / name
                _copy_file(real, dst)
                dst.chmod(0o755)
                copied[name] = dst
                queue.append(dst)

    for name, dylib in copied.items():
        _install_name_tool_id(dylib, f"@loader_path/{name}")

    for target in [bin_path, *copied.values()]:
        deps = _otool_deps(target)
        for dep in deps:
            if not _is_homebrew_path(dep):
                continue
            real = Path(os.path.realpath(dep))
            name = real.name
            if name not in copied:
                continue
            if target == bin_path:
                new = f"@loader_path/lib/{name}"
            else:
                new = f"@loader_path/{name}"
            _install_name_tool_change(target, dep, new)


def main() -> int:
    rsync = Path("/opt/homebrew/bin/rsync")
    if not rsync.exists():
        raise SystemExit("未找到 /opt/homebrew/bin/rsync，请先安装 Homebrew rsync 3.x。")

    out = Path(__file__).resolve().parents[1] / "vendor" / "rsync"
    if out.exists():
        shutil.rmtree(out)
    bundle(rsync, out)
    print("已打包内置 rsync 到：", out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
