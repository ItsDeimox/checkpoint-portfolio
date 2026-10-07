"""Compatibility entrypoint; cinematic suite includes the previous regression behaviors."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("browser-cinematic.py")),run_name="__main__")
