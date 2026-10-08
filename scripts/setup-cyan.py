#!/usr/bin/env python3
"""Prepare an operator SDK and save host-owned Cyan runtime configuration."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def prepare(args):
    sdk = Path(args.sdk).expanduser().resolve(strict=True)
    project = sdk / "Project.toml"
    worker = sdk / "runtime/scripts/session_loop.jl"
    crate = sdk / "runtime/host/Cargo.toml"
    if not project.is_file() or not worker.is_file() or not crate.is_file():
        raise ValueError(f"Not a maintained Palette SDK checkout: {sdk}")
    julia = shutil.which("julia")
    if not julia or not shutil.which("bwrap"):
        raise ValueError("Install Julia and bubblewrap before preparing Cyan")
    env = os.environ.copy()
    depot = Path(args.depot).expanduser().resolve() if args.depot else None
    if depot:
        env["JULIA_DEPOT_PATH"] = str(depot)
    host = sdk / "runtime/host/target/release/palette-host"
    if not args.prepared:
        if not shutil.which("cargo"):
            raise ValueError("Install Cargo before building the Palette host")
        if depot:
            depot.mkdir(parents=True, exist_ok=True)
        subprocess.run([julia, f"--project={sdk}", "-e", "using Pkg; Pkg.instantiate()"], env=env, check=True)
        subprocess.run(["cargo", "build", "--release", "--locked", "--manifest-path", str(crate)], check=True)
    if not os.access(host, os.X_OK):
        raise ValueError(f"Prepared Palette host is missing: {host}")
    subprocess.run([julia, "--startup-file=no", f"--project={sdk}", "-e", 'using Palette; println("Palette load verified")'], env=env, check=True)
    agent_dir = Path(args.agent_dir).expanduser().resolve()
    agent_dir.mkdir(parents=True, exist_ok=True)
    config = {"sdkPath": str(sdk), "hostBin": str(host)}
    if depot:
        config["depotPath"] = str(depot)
    target = agent_dir / "palette.json"
    if target.exists():
        shutil.copy2(target, agent_dir / "palette.json.previous")
    with tempfile.NamedTemporaryFile(mode="w", dir=agent_dir, prefix=".palette-", delete=False) as stream:
        temp = Path(stream.name)
        try:
            json.dump(config, stream, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        except BaseException:
            temp.unlink(missing_ok=True)
            raise
    try:
        temp.replace(target)
    finally:
        temp.unlink(missing_ok=True)
    print(f"Cyan runtime configured: {target}")
    print("Start from your task directory with cyan. Configure the model separately; no credentials were copied.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sdk", required=True, help="Maintained Palette SDK checkout")
    parser.add_argument("--depot", help="Dedicated Julia dependency depot")
    parser.add_argument("--agent-dir", default=os.environ.get("CYAN_AGENT_DIR", os.environ.get("CYAN_CODING_AGENT_DIR", os.environ.get("PRIME_AGENT_CODING_AGENT_DIR", "~/.cyan/agent"))))
    parser.add_argument("--prepared", action="store_true", help="Validate an already built SDK without rebuilding it")
    args = parser.parse_args()
    try:
        prepare(args)
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"cyan setup: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
