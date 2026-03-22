#!/usr/bin/env bash

set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required for connector publishing" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required for connector publishing" >&2
  exit 1
fi

branch="${PUBLISH_BRANCH:-main}"
remote_name="${PUBLISH_REMOTE:-origin}"
remote_url="$(git remote get-url "$remote_name")"
owner_repo="$(printf '%s\n' "$remote_url" | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"
owner="${owner_repo%%/*}"
repo="${owner_repo##*/}"
local_head="$(git rev-parse HEAD)"
state_local_ref="refs/codex/connector-last-published-local"
state_remote_ref="refs/codex/connector-last-published-remote"

read_git_file() {
  local ref="$1"
  local path="$2"
  local sentinel="__CODEX_EOF__"
  local data
  data="$(git show "${ref}:${path}"; printf '%s' "$sentinel")"
  printf '%s' "${data%$sentinel}"
}

if [[ -n "$(git status --short)" ]]; then
  echo "working tree is not clean; commit or stash changes before publishing" >&2
  exit 1
fi

if [[ "${SKIP_PUBLISH_VERIFY:-0}" != "1" ]]; then
  echo "running checkpoint verification"
  npm run verify:checkpoint
fi

if git rev-parse --verify "$state_local_ref" >/dev/null 2>&1; then
  publish_base="$(git rev-parse "$state_local_ref")"
else
  publish_base="$(git rev-parse "${remote_name}/${branch}")"
fi

if git rev-parse --verify "$state_remote_ref" >/dev/null 2>&1; then
  expected_remote_head="$(git rev-parse "$state_remote_ref")"
else
  expected_remote_head="$(git rev-parse "${remote_name}/${branch}")"
fi

if [[ "$local_head" == "$publish_base" ]]; then
  echo "local HEAD already matches the last published local commit; nothing to publish"
  exit 0
fi

commit_message="$(git log -1 --pretty=%s "$local_head")"
remote_head="$(
  docker mcp tools call list_commits "owner=${owner}" "repo=${repo}" "sha=${branch}" perPage=1 \
    | python3 -c 'import json, re, sys; text = sys.stdin.read(); match = re.search(r"(\[\{.*\}\])", text, re.S); data = json.loads(match.group(1)); print(data[0]["sha"])'
)"

if [[ "$remote_head" != "$expected_remote_head" ]]; then
  echo "remote ${branch} has moved unexpectedly" >&2
  echo "expected: $expected_remote_head" >&2
  echo "actual:   $remote_head" >&2
  echo "publish aborted to avoid overwriting outside work" >&2
  exit 1
fi

changed_entries="$(git diff --name-status "${publish_base}..${local_head}")"

if [[ -z "$changed_entries" ]]; then
  echo "no tracked file changes found between ${publish_base} and ${local_head}"
  exit 0
fi

index=0
total="$(printf '%s\n' "$changed_entries" | wc -l | tr -d ' ')"

while IFS= read -r entry; do
  index=$((index + 1))
  status="${entry%%$'\t'*}"
  path="${entry#*$'\t'}"
  step_message="${commit_message} [connector ${index}/${total}]"

  case "$status" in
    A|M)
      if git cat-file -e "${remote_name}/${branch}:${path}" 2>/dev/null; then
        sha="$(git rev-parse "${remote_name}/${branch}:${path}")"
        content="$(read_git_file "${local_head}" "${path}")"
        docker mcp tools call create_or_update_file \
          "owner=${owner}" \
          "repo=${repo}" \
          "branch=${branch}" \
          "path=${path}" \
          "message=${step_message}" \
          "sha=${sha}" \
          "content=${content}" >/dev/null
      else
        content="$(read_git_file "${local_head}" "${path}")"
        docker mcp tools call create_or_update_file \
          "owner=${owner}" \
          "repo=${repo}" \
          "branch=${branch}" \
          "path=${path}" \
          "message=${step_message}" \
          "content=${content}" >/dev/null
      fi
      ;;
    D)
      sha="$(git rev-parse "${remote_name}/${branch}:${path}")"
      docker mcp tools call delete_file \
        "owner=${owner}" \
        "repo=${repo}" \
        "branch=${branch}" \
        "path=${path}" \
        "message=${step_message}" \
        "sha=${sha}" >/dev/null
      ;;
    *)
      echo "unsupported change status '${status}' for ${path}" >&2
      exit 1
      ;;
  esac

  echo "published ${index}/${total}: ${path}"
done <<EOF
$changed_entries
EOF

git fetch "$remote_name" "$branch" >/dev/null
git update-ref "$state_local_ref" "$local_head"
git update-ref "$state_remote_ref" "$(git rev-parse "${remote_name}/${branch}")"

echo "connector publish complete for ${owner_repo}@${branch}"