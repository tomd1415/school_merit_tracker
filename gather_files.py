#!/usr/bin/env python3

import os
import sys


def load_gitignore():
    """
    Loads .gitignore patterns into a list.
    Skips commented (#) or empty lines.
    """
    patterns = []
    gitignore_path = os.path.join(os.getcwd(), ".gitignore")
    if os.path.isfile(gitignore_path):
        with open(gitignore_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                patterns.append(line)
    return patterns


def should_ignore(path, patterns):
    """
    Checks if 'path' should be ignored based on a naïve match
    of the patterns from .gitignore.

    This is a simplified approach:
    - If a pattern ends with '/' (indicating a directory), we ignore
      if our basename matches that directory name.
    - Otherwise, we ignore if the basename exactly matches the pattern.

    Note: This does not handle wildcards (*) or advanced .gitignore rules.
    """
    basename = os.path.basename(path)
    for pattern in patterns:
        # If pattern ends with '/', assume it's a directory
        if pattern.endswith('/'):
            # e.g. "node_modules/" => ignore if this is a dir named node_modules
            if basename == pattern.rstrip('/'):
                return True
        else:
            # If it's a file pattern, ignore if it exactly matches
            if basename == pattern:
                return True
    return False


def build_directory_tree(start_path, ignore_patterns, prefix="", is_last=True):
    """
    Recursively builds a list of lines showing the directory tree structure.

    :param start_path: The directory to process
    :param ignore_patterns: Patterns from .gitignore
    :param prefix: The prefix string used for indentation in the tree
    :param is_last: Whether this is the last item in the current directory
    :return: A list of text lines representing the tree
    """
    lines = []
    basename = os.path.basename(start_path)

    # Determine which tree branch character to use
    connector = "└── " if is_last else "├── "
    lines.append(prefix + connector + basename + "/")

    # Prepare prefix for child items
    child_prefix = prefix + ("    " if is_last else "│   ")

    # Gather sub-entries
    try:
        entries = os.listdir(start_path)
    except PermissionError:
        # If we can't read the directory, skip
        return lines

    # Sort entries so the tree is consistent
    entries.sort()

    # Filter out anything that .gitignore says to ignore
    # We'll also skip hidden system directories like .git automatically
    # if they appear in the .gitignore (or we can skip them unconditionally).
    visible_entries = []
    for entry in entries:
        if entry == ".git":    # <<< HARD-CODED SKIP
            continue
        full_path = os.path.join(start_path, entry)
        if should_ignore(full_path, ignore_patterns):
            continue
        # We'll skip the .git directory automatically if you prefer:
        # if entry == ".git":
        #    continue
        if os.path.isdir(full_path):
            visible_entries.append(entry)
        else:
            # We'll list normal files after directories, or you can keep them sorted
            visible_entries.append(entry)

    # Create directory list and file list
    dirs = [e for e in visible_entries if os.path.isdir(
        os.path.join(start_path, e))]
    files = [e for e in visible_entries if os.path.isfile(
        os.path.join(start_path, e))]

    # Recursively process subdirectories
    for i, d in enumerate(dirs):
        # if no files come after the last dir
        sub_is_last = (i == len(dirs) - 1 and not files)
        dir_path = os.path.join(start_path, d)
        lines += build_directory_tree(dir_path,
                                      ignore_patterns, child_prefix, sub_is_last)

    # Add files under this directory
    for j, f in enumerate(files):
        file_connector = "└── " if j == len(files) - 1 else "├── "
        lines.append(child_prefix + file_connector + f)

    return lines


def collect_files(start_path, ignore_patterns, valid_extensions=None):
    """
    Recursively collect all files (except ignored) from start_path.
    If valid_extensions is provided (non-empty), filter by those extensions.
    Returns a list of full file paths.
    """
    collected = []

    for root, dirs, files in os.walk(start_path):
        # Remove ignored directories from walk
        # (so we don't descend into them at all)
        dirs[:] = [d for d in dirs if not should_ignore(
            os.path.join(root, d), ignore_patterns)]

        for file in files:
            file_path = os.path.join(root, file)

            # Skip ignored files
            if should_ignore(file_path, ignore_patterns):
                continue

            # If the user specified file extensions, check them
            if valid_extensions:
                # e.g. if user typed .js, we check if file ends with .js
                if not any(file.lower().endswith(ext.lower()) for ext in valid_extensions):
                    continue

            collected.append(file_path)

    return collected


def main():
    # Gather user-specified extensions (if any)
    # e.g. python gather_files.py .js .css
    if len(sys.argv) > 1:
        valid_extensions = sys.argv[1:]
    else:
        valid_extensions = None

    ignore_patterns = load_gitignore()

    # 1) Build directory tree lines (skipping ignored paths)
    # We'll do this from the current directory, e.g. "."
    tree_lines = build_directory_tree(
        os.getcwd(), ignore_patterns, prefix="", is_last=True)

    # 2) Collect all files that are not ignored
    #    If valid_extensions is None or empty, we include all
    collected_files = collect_files(
        os.getcwd(), ignore_patterns, valid_extensions)

    # 3) Output everything to "output.txt"
    output_filename = "output.txt"
    with open(output_filename, "w", encoding="utf-8") as out:
        # Write the directory tree
        out.write("DIRECTORY TREE:\n")
        for line in tree_lines:
            out.write(line + "\n")

        out.write("\n========================================\n")
        out.write("FILE CONTENTS:\n")
        out.write("========================================\n\n")

        # For each file, write a header and then the file content
        for f in sorted(collected_files):
            rel_path = os.path.relpath(f, os.getcwd())
            out.write(f"\n===== FILE: {rel_path} =====\n")
            try:
                with open(f, "r", encoding="utf-8", errors="replace") as fh:
                    content = fh.read()
                out.write(content + "\n")
            except Exception as e:
                # If we cannot read the file (binary, permission error, etc.), note it
                out.write(f"[Unable to read file: {e}]\n")

    print(f"Done! Output written to {output_filename}")


if __name__ == "__main__":
    main()
