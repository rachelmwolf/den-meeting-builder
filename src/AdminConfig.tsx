import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type {
  Activity,
  ActivityDirectionSection,
  ActivityDirectionStep,
  ActivityMeetingSpace,
  AdminCurriculumDetail,
  AdminCurriculumListItem,
  AdminCurriculumWrite,
  Adventure,
  CurriculumEntityType,
  ContentStatus,
  Rank,
  Requirement,
  SourceSnapshot,
} from "../shared/types.js";
import { newGuid } from "../shared/utils.js";

const entityOrder: CurriculumEntityType[] = ["activities", "requirements", "adventures", "ranks"];

const entityLabels: Record<CurriculumEntityType, { title: string; subtitle: string }> = {
  activities: { title: "Activities", subtitle: "Edit activity metadata, packet content, and source details." },
  requirements: { title: "Requirements", subtitle: "Repair requirement text and adventure links." },
  adventures: { title: "Adventures", subtitle: "Maintain adventure names, categories, and snapshots." },
  ranks: { title: "Ranks", subtitle: "Keep rank labels and source references aligned." }
};

const singularEntityLabels: Record<CurriculumEntityType, string> = {
  activities: "activity",
  requirements: "requirement",
  adventures: "adventure",
  ranks: "rank"
};

type DraftState = AdminCurriculumWrite;
type ActivityDirectionsState = NonNullable<Activity["directions"]>;
type DirectionSectionKey = keyof ActivityDirectionsState;

const directionSectionLabels: Record<DirectionSectionKey, string> = {
  atHomeOption: "At Home Option",
  before: "Before the Meeting",
  during: "During the Meeting",
  after: "After the Meeting"
};

function newId(): string {
  return newGuid();
}

function formatRefreshedAt(value: string | null): string {
  if (!value) return "Not imported";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function emptyDirections(): ActivityDirectionsState {
  return {
    atHomeOption: null,
    before: null,
    during: null,
    after: null
  };
}

function serializeDirectionSteps(steps: ActivityDirectionStep[] | undefined): string {
  return (steps ?? [])
    .map((step) => [step.text, ...step.bullets.map((bullet) => `- ${bullet}`)].join("\n"))
    .join("\n\n");
}

function parseDirectionSteps(value: string): ActivityDirectionStep[] {
  return value
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((block) => block.length > 0)
    .map((block) => {
      const [firstLine, ...rest] = block;
      const bullets = rest.map((line) => line.replace(/^[-*]\s+/, "").trim()).filter(Boolean);
      return {
        text: firstLine.replace(/^[-*]\s+/, ""),
        bullets
      };
    })
    .filter((step) => step.text.length > 0);
}

function updateDirectionsSection(
  directions: Activity["directions"] | null | undefined,
  key: DirectionSectionKey,
  patch: Partial<ActivityDirectionSection> | null
): ActivityDirectionsState {
  const next = { ...(directions ?? emptyDirections()) };
  if (patch === null) {
    next[key] = null;
    return next;
  }
  const current = directions?.[key];
  const heading = patch.heading ?? current?.heading ?? "";
  const steps = patch.steps ?? current?.steps ?? [];
  if (!heading.trim() && steps.length === 0) {
    next[key] = null;
    return next;
  }
  next[key] = {
    heading,
    steps
  };
  return next;
}

function filterItems(items: AdminCurriculumListItem[], entityType: CurriculumEntityType, search: string): AdminCurriculumListItem[] {
  const query = search.trim().toLowerCase();
  return items
    .filter((item) => item.entityType === entityType)
    .filter((item) => {
      if (!query) return true;
      const haystack = [item.title, item.subtitle, item.sourceUrl, item.tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(query);
    });
}

function cloneDraft(detail: AdminCurriculumDetail): DraftState {
  switch (detail.entityType) {
    case "ranks":
      return { entityType: "ranks", record: { id: detail.record.id, name: detail.record.name, grade: detail.record.grade, slug: detail.record.slug, sourceUrl: detail.record.sourceUrl } };
    case "adventures":
      return {
        entityType: "adventures",
        record: {
          id: detail.record.id,
          rankId: detail.record.rankId,
          name: detail.record.name,
          slug: detail.record.slug,
          kind: detail.record.kind,
          category: detail.record.category,
          sourceUrl: detail.record.sourceUrl,
          snapshot: detail.record.snapshot
        }
      };
    case "requirements":
      return {
        entityType: "requirements",
        record: {
          id: detail.record.id,
          adventureId: detail.record.adventureId,
          requirementNumber: detail.record.requirementNumber,
          text: detail.record.text
        }
      };
    case "activities":
      return {
        entityType: "activities",
        record: {
          id: detail.record.id,
          adventureId: detail.record.adventureId,
          requirementId: detail.record.requirementId,
          name: detail.record.name,
          slug: detail.record.slug,
          sourceUrl: detail.record.sourceUrl,
          summary: detail.record.summary,
          meetingSpace: detail.record.meetingSpace,
          energyLevel: detail.record.energyLevel,
          supplyLevel: detail.record.supplyLevel,
          prepLevel: detail.record.prepLevel,
          durationMinutes: detail.record.durationMinutes,
          materials: detail.record.materials,
          supplyNote: detail.record.supplyNote,
          directions: detail.record.directions,
          hasAdditionalResources: detail.record.hasAdditionalResources,
          previewDetails: detail.record.previewDetails
        }
      };
  }
}

function getDefaultAdventureId(adventures: AdminCurriculumListItem[]): string {
  return adventures[0]?.id ?? "";
}

function getAdventureTitle(adventures: AdminCurriculumListItem[], adventureId: string): string | null {
  return adventures.find((item) => item.entityType === "adventures" && item.id === adventureId)?.title ?? null;
}

function getRequirementOptions(
  requirements: AdminCurriculumListItem[],
  adventures: AdminCurriculumListItem[],
  adventureId: string
): AdminCurriculumListItem[] {
  const adventureTitle = getAdventureTitle(adventures, adventureId);
  if (!adventureTitle) {
    return [];
  }
  return requirements.filter((item) => item.entityType === "requirements" && item.subtitle.endsWith(`· ${adventureTitle}`));
}

function buildBlankDraft(
  entityType: CurriculumEntityType,
  ranks: AdminCurriculumListItem[],
  adventures: AdminCurriculumListItem[],
  requirements: AdminCurriculumListItem[]
): DraftState {
  if (entityType === "ranks") {
    return {
      entityType: "ranks",
      record: {
        id: newId(),
        name: "",
        grade: "",
        slug: "",
        sourceUrl: ""
      }
    };
  }
  if (entityType === "adventures") {
    const rankId = ranks[0]?.id ?? "";
    return {
      entityType: "adventures",
      record: {
        id: newId(),
        rankId,
        name: "",
        slug: "",
        kind: "required",
        category: "",
        sourceUrl: "",
        snapshot: ""
      }
    };
  }
  if (entityType === "requirements") {
    const adventureId = getDefaultAdventureId(adventures);
    return {
      entityType: "requirements",
      record: {
        id: newId(),
        adventureId,
        requirementNumber: 1,
        text: ""
      }
    };
  }
  const adventureId = getDefaultAdventureId(adventures);
  const requirementId = getRequirementOptions(requirements, adventures, adventureId)[0]?.id ?? null;
  return {
    entityType: "activities",
    record: {
      id: newId(),
      adventureId,
      requirementId,
      name: "",
      slug: "",
      sourceUrl: "",
      summary: "",
      meetingSpace: "unknown" as ActivityMeetingSpace,
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null,
      durationMinutes: null,
      materials: [],
      supplyNote: undefined,
      directions: null,
      hasAdditionalResources: false,
      previewDetails: ""
    }
  };
}

function formatEntityCount(items: AdminCurriculumListItem[], entityType: CurriculumEntityType): string {
  return String(items.filter((item) => item.entityType === entityType).length);
}

function renderTags(tags: string[]): ReactNode[] {
  return tags.map((tag) => (
    <span className="admin-tag" key={tag}>
      {tag}
    </span>
  ));
}

export function AdminConfigPage() {
  const [contentStatus, setContentStatus] = useState<ContentStatus | null>(null);
  const [items, setItems] = useState<AdminCurriculumListItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<CurriculumEntityType>("activities");
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedDetail, setSelectedDetail] = useState<AdminCurriculumDetail | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [listError, setListError] = useState("");

  const ranks = useMemo(() => items.filter((item) => item.entityType === "ranks"), [items]);
  const adventures = useMemo(() => items.filter((item) => item.entityType === "adventures"), [items]);
  const requirements = useMemo(() => items.filter((item) => item.entityType === "requirements"), [items]);
  const filteredItems = useMemo(() => filterItems(items, selectedEntity, search), [items, selectedEntity, search]);

  useEffect(() => {
    api.getContentStatus().then(setContentStatus).catch(() => setContentStatus(null));
    api.listAdminCurriculum()
      .then((response) => setItems(response.items))
      .catch(() => setListError("Curriculum records could not be loaded. Restart the current server so /api/admin/curriculum is served from the latest build."))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (isCreatingNew) {
      return;
    }
    if (!filteredItems.length) {
      setSelectedId("");
      setSelectedDetail(null);
      setDraft(null);
      return;
    }
    if (!filteredItems.some((item) => item.id === selectedId)) {
      const next = filteredItems[0];
      setSelectedId(next.id);
    }
  }, [filteredItems, selectedId, isCreatingNew]);

  useEffect(() => {
    if (!selectedId || isCreatingNew) {
      return;
    }
    setLoadingDetail(true);
    api.getAdminCurriculumDetail(selectedEntity, selectedId)
      .then((detail) => {
        setSelectedDetail(detail);
        setDraft(cloneDraft(detail));
        setDirty(false);
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedEntity, selectedId, isCreatingNew]);

  function switchEntity(nextEntity: CurriculumEntityType): void {
    if (dirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    setSelectedEntity(nextEntity);
    setSearch("");
    setSelectedId("");
    setSelectedDetail(null);
    setDraft(null);
    setLoadingDetail(false);
    setIsCreatingNew(false);
    setDirty(false);
    setMessage("");
    setListError("");
  }

  function openSelected(id: string): void {
    if (dirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    setIsCreatingNew(false);
    setSelectedId(id);
    setMessage("");
    setListError("");
  }

  function startNewRecord(): void {
    if (dirty && !window.confirm("Discard unsaved changes?")) {
      return;
    }
    setIsCreatingNew(true);
    setSelectedId("");
    setSelectedDetail(null);
    setDraft(buildBlankDraft(selectedEntity, ranks, adventures, requirements));
    setLoadingDetail(false);
    setDirty(true);
    setMessage("");
    setListError("");
  }

  function updateDraft<T extends DraftState["record"]>(patch: Partial<T>): void {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        record: {
          ...current.record,
          ...patch
        }
      } as DraftState;
    });
    setDirty(true);
  }

  async function handleSave(): Promise<void> {
    if (!draft) return;
    setSaving(true);
    setMessage("");
    try {
      const saved = await api.saveAdminCurriculumRecord(draft);
      const refreshed = await api.listAdminCurriculum();
      setItems(refreshed.items);
      setListError("");
      setSelectedEntity(saved.entityType);
      setSelectedId(saved.record.id);
      setIsCreatingNew(false);
      setSelectedDetail(saved);
      setDraft(cloneDraft(saved));
      setDirty(false);
      setMessage("Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save record.");
    } finally {
      setSaving(false);
    }
  }

  function renderDetail(): React.ReactElement {
    if (!draft) {
      return (
        <div className="empty-state">
          <p>Select a curriculum row to edit it, or create a new one.</p>
        </div>
      );
    }

    const snapshot = selectedDetail?.record.sourceSnapshot ?? null;

    if (draft.entityType === "ranks") {
      return (
        <div className="admin-detail-form">
          <label>
            ID
            <input value={draft.record.id} readOnly />
          </label>
          <label>
            Name
            <input value={draft.record.name} onChange={(event) => updateDraft<{ entityType: "ranks"; record: Rank }["record"]>({ name: event.target.value })} />
          </label>
          <label>
            Grade
            <input value={draft.record.grade} onChange={(event) => updateDraft<{ entityType: "ranks"; record: Rank }["record"]>({ grade: event.target.value })} />
          </label>
          <label>
            Slug
            <input value={draft.record.slug} onChange={(event) => updateDraft<{ entityType: "ranks"; record: Rank }["record"]>({ slug: event.target.value })} />
          </label>
          <label>
            Source URL
            <input value={draft.record.sourceUrl} onChange={(event) => updateDraft<{ entityType: "ranks"; record: Rank }["record"]>({ sourceUrl: event.target.value })} />
          </label>
          <div className="admin-meta-line">
            <strong>{selectedDetail?.entityType === "ranks" ? selectedDetail.record.adventureCount : 0} adventures</strong>
            <strong>{selectedDetail?.entityType === "ranks" ? selectedDetail.record.denCount : 0} dens</strong>
          </div>
          {snapshot ? (
            <section className="admin-snapshot">
              <div className="admin-snapshot-head">
                <h3>Source snapshot</h3>
                <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
                  Open source
                </a>
              </div>
              <p className="subtle-line">Fetched {formatRefreshedAt(snapshot.fetchedAt)}</p>
              <pre>{snapshot.rawHtml}</pre>
            </section>
          ) : null}
        </div>
      );
    }

    if (draft.entityType === "adventures") {
      return (
        <div className="admin-detail-form">
          <label>
            ID
            <input value={draft.record.id} readOnly />
          </label>
          <label>
            Rank
            <select value={draft.record.rankId} onChange={(event) => updateDraft<{ entityType: "adventures"; record: Adventure }["record"]>({ rankId: event.target.value })}>
              {ranks.map((rank) => (
                <option key={rank.id} value={rank.id}>
                  {rank.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input value={draft.record.name} onChange={(event) => updateDraft<{ entityType: "adventures"; record: Adventure }["record"]>({ name: event.target.value })} />
          </label>
          <div className="admin-two-up">
            <label>
              Slug
              <input value={draft.record.slug} onChange={(event) => updateDraft<{ entityType: "adventures"; record: Adventure }["record"]>({ slug: event.target.value })} />
            </label>
            <label>
              Type
              <select value={draft.record.kind} onChange={(event) => updateDraft<{ entityType: "adventures"; record: Adventure }["record"]>({ kind: event.target.value as Adventure["kind"] })}>
                <option value="required">Required</option>
                <option value="elective">Elective</option>
              </select>
            </label>
          </div>
          <label>
            Category
            <input value={draft.record.category} onChange={(event) => updateDraft<{ entityType: "adventures"; record: Adventure }["record"]>({ category: event.target.value })} />
          </label>
          <label>
            Source URL
            <input value={draft.record.sourceUrl} onChange={(event) => updateDraft<{ entityType: "adventures"; record: Adventure }["record"]>({ sourceUrl: event.target.value })} />
          </label>
          <label>
            Snapshot
            <textarea value={draft.record.snapshot} onChange={(event) => updateDraft<{ entityType: "adventures"; record: Adventure }["record"]>({ snapshot: event.target.value })} />
          </label>
          <div className="admin-meta-line">
            <strong>{selectedDetail?.entityType === "adventures" ? selectedDetail.record.requirementCount : 0} requirements</strong>
            <strong>{selectedDetail?.entityType === "adventures" ? selectedDetail.record.activityCount : 0} activities</strong>
          </div>
          {snapshot ? (
            <section className="admin-snapshot">
              <div className="admin-snapshot-head">
                <h3>Source snapshot</h3>
                <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
                  Open source
                </a>
              </div>
              <p className="subtle-line">Fetched {formatRefreshedAt(snapshot.fetchedAt)}</p>
              <pre>{snapshot.rawHtml}</pre>
            </section>
          ) : null}
        </div>
      );
    }

    if (draft.entityType === "requirements") {
      const adventureOptions = adventures;
      return (
        <div className="admin-detail-form">
          <label>
            ID
            <input value={draft.record.id} readOnly />
          </label>
          <label>
            Adventure
            <select value={draft.record.adventureId} onChange={(event) => updateDraft<{ entityType: "requirements"; record: Requirement }["record"]>({ adventureId: event.target.value })}>
              {adventureOptions.map((adventure) => (
                <option key={adventure.id} value={adventure.id}>
                  {adventure.title}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-two-up">
            <label>
              Requirement #
              <input
                type="number"
                min={1}
                value={draft.record.requirementNumber}
                onChange={(event) =>
                  updateDraft<{ entityType: "requirements"; record: Requirement }["record"]>({ requirementNumber: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Text
              <input value={draft.record.text} onChange={(event) => updateDraft<{ entityType: "requirements"; record: Requirement }["record"]>({ text: event.target.value })} />
            </label>
          </div>
          <div className="admin-meta-line">
            <strong>{selectedDetail?.entityType === "requirements" ? selectedDetail.record.activityCount : 0} activities</strong>
            <strong>{selectedDetail?.entityType === "requirements" ? selectedDetail.record.rankName : ""}</strong>
            <strong>{selectedDetail?.entityType === "requirements" ? selectedDetail.record.adventureName : ""}</strong>
          </div>
          {snapshot ? (
            <section className="admin-snapshot">
              <div className="admin-snapshot-head">
                <h3>Source snapshot</h3>
                <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
                  Open source
                </a>
              </div>
              <p className="subtle-line">Fetched {formatRefreshedAt(snapshot.fetchedAt)}</p>
              <pre>{snapshot.rawHtml}</pre>
            </section>
          ) : null}
        </div>
      );
    }

    const requirementOptions = getRequirementOptions(requirements, adventures, draft.record.adventureId);
    const directions = draft.record.directions ?? emptyDirections();
    return (
      <div className="admin-detail-form">
        <section className="admin-form-section">
          <div className="admin-form-section-head">
            <div>
              <h3>Identity</h3>
              <p className="subtle-line">Keep the record linked to the right adventure and source page.</p>
            </div>
          </div>
          <label>
            ID
            <input value={draft.record.id} readOnly />
          </label>
          <label>
            Adventure
            <select
              value={draft.record.adventureId}
              onChange={(event) => {
                const nextAdventureId = event.target.value;
                const nextRequirementId = getRequirementOptions(requirements, adventures, nextAdventureId)[0]?.id ?? null;
                updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ adventureId: nextAdventureId, requirementId: nextRequirementId });
              }}
            >
              {adventures.map((adventure) => (
                <option key={adventure.id} value={adventure.id}>
                  {adventure.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Requirement
            <select
              value={draft.record.requirementId ?? ""}
              onChange={(event) =>
                updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ requirementId: event.target.value || null })
              }
            >
              <option value="">None</option>
              {requirementOptions.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {requirement.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Name
            <input value={draft.record.name} onChange={(event) => updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ name: event.target.value })} />
          </label>
          <label>
            Summary
            <textarea value={draft.record.summary} onChange={(event) => updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ summary: event.target.value })} />
          </label>
          <div className="admin-two-up">
            <label>
              Slug
              <input value={draft.record.slug} onChange={(event) => updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ slug: event.target.value })} />
            </label>
            <label>
              Source URL
              <input value={draft.record.sourceUrl} onChange={(event) => updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ sourceUrl: event.target.value })} />
            </label>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-head">
            <div>
              <h3>Planner fit</h3>
              <p className="subtle-line">Keep the matching fields that drive packet selection and timing.</p>
            </div>
          </div>
          <div className="admin-two-up">
            <label>
              Meeting Space
              <select
                value={draft.record.meetingSpace}
                onChange={(event) => updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ meetingSpace: event.target.value as ActivityMeetingSpace })}
              >
                <option value="unknown">Unknown</option>
                <option value="indoor">Indoor</option>
                <option value="outing-with-travel">Outing with travel</option>
                <option value="outdoor">Outdoor</option>
                <option value="indoor-or-outdoor">Indoor or outdoor</option>
              </select>
            </label>
            <label>
              Duration Minutes
              <input
                type="number"
                min={0}
                value={draft.record.durationMinutes ?? ""}
                onChange={(event) =>
                  updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ durationMinutes: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
          </div>
          <div className="admin-two-up">
            <label>
              Energy
              <input
                type="number"
                min={1}
                max={5}
                value={draft.record.energyLevel ?? ""}
                onChange={(event) =>
                  updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ energyLevel: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
            <label>
              Supplies
              <input
                type="number"
                min={1}
                max={5}
                value={draft.record.supplyLevel ?? ""}
                onChange={(event) =>
                  updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ supplyLevel: event.target.value ? Number(event.target.value) : null })
                }
              />
            </label>
          </div>
          <label>
            Prep
            <input
              type="number"
              min={1}
              max={5}
              value={draft.record.prepLevel ?? ""}
              onChange={(event) =>
                updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ prepLevel: event.target.value ? Number(event.target.value) : null })
              }
            />
          </label>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-head">
            <div>
              <h3>Packet content</h3>
              <p className="subtle-line">These fields drive the materials list and the printed packet text.</p>
            </div>
          </div>
          <label>
            Materials
            <textarea
              value={draft.record.materials.join("\n")}
              onChange={(event) =>
                updateDraft<{ entityType: "activities"; record: Activity }["record"]>({
                  materials: event.target.value.split(/\n+/).map((value) => value.trim()).filter(Boolean)
                })
              }
            />
          </label>
          <label>
            Supply note
            <textarea
              value={draft.record.supplyNote ?? ""}
              onChange={(event) =>
                updateDraft<{ entityType: "activities"; record: Activity }["record"]>({
                  supplyNote: event.target.value.trim() ? event.target.value : undefined
                })
              }
            />
          </label>
          <label>
            Preview details
            <textarea
              value={draft.record.previewDetails}
              onChange={(event) => updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ previewDetails: event.target.value })}
            />
          </label>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={Boolean(draft.record.hasAdditionalResources)}
              onChange={(event) =>
                updateDraft<{ entityType: "activities"; record: Activity }["record"]>({ hasAdditionalResources: event.target.checked })
              }
            />
            Has additional resources
          </label>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-head">
            <div>
              <h3>Directions</h3>
              <p className="subtle-line">Edit the section text that prints into the packet and activity drawer.</p>
            </div>
          </div>
          <div className="admin-direction-grid">
            {(Object.entries(directionSectionLabels) as [DirectionSectionKey, string][]).map(([key, label]) => {
              const section = directions[key];
              return (
                <div className="admin-direction-card" key={key}>
                  <h4>{label}</h4>
                  <label>
                    Heading
                    <input
                      value={section?.heading ?? ""}
                      onChange={(event) =>
                        updateDraft<{ entityType: "activities"; record: Activity }["record"]>({
                          directions: updateDirectionsSection(draft.record.directions, key, { heading: event.target.value })
                        })
                      }
                    />
                  </label>
                  <label>
                    Steps
                    <textarea
                      value={serializeDirectionSteps(section?.steps)}
                      onChange={(event) =>
                        updateDraft<{ entityType: "activities"; record: Activity }["record"]>({
                          directions: updateDirectionsSection(draft.record.directions, key, { steps: parseDirectionSteps(event.target.value) })
                        })
                      }
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <div className="admin-meta-line">
          <strong>{selectedDetail?.entityType === "activities" ? selectedDetail.record.rankName : ""}</strong>
          <strong>{selectedDetail?.entityType === "activities" ? selectedDetail.record.adventureName : ""}</strong>
          <strong>{selectedDetail?.entityType === "activities" && selectedDetail.record.requirementNumber ? `Requirement ${selectedDetail.record.requirementNumber}` : "No requirement"}</strong>
        </div>
        {snapshot ? (
          <section className="admin-snapshot">
            <div className="admin-snapshot-head">
              <h3>Source snapshot</h3>
              <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
                Open source
              </a>
            </div>
            <p className="subtle-line">Fetched {formatRefreshedAt(snapshot.fetchedAt)}</p>
            <pre>{snapshot.rawHtml}</pre>
          </section>
        ) : null}
      </div>
    );
  }

  const selectedListItem = filteredItems.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Maintenance</p>
          <h1>Curriculum Editor</h1>
          <p className="hero-copy">
            Search imported curriculum records, inspect the source snapshot, and keep the planner data clean.
          </p>
        </div>
        <a className="secondary-button admin-back-link" href="/">
          Back to planner
        </a>
      </header>

      <section className="admin-status">
        <div className="summary-card">
          <span>Imported ranks</span>
          <strong>{contentStatus?.importedRanks.length ?? 0}</strong>
        </div>
        <div className="summary-card">
          <span>Last refresh</span>
          <strong>{formatRefreshedAt(contentStatus?.lastRefreshedAt ?? null)}</strong>
        </div>
        <div className="summary-card">
          <span>Activities with materials</span>
          <strong>{contentStatus ? `${contentStatus.activityFieldCoverage.materialsCount}/${contentStatus.activityFieldCoverage.totalActivities}` : "Not available"}</strong>
        </div>
      </section>

      <main className="admin-layout">
        <aside className="admin-list-panel panel">
          <div className="admin-list-head">
            <div>
              <h2>Record browser</h2>
              <p className="subtle-line">Pick an entity, search the imported records, then open one in the inspector.</p>
            </div>
            <button className="secondary-button" onClick={startNewRecord}>
              New {singularEntityLabels[selectedEntity]}
            </button>
          </div>

          <div className="admin-tabs">
            {entityOrder.map((entity) => (
              <button
                key={entity}
                className={`admin-tab ${selectedEntity === entity ? "admin-tab-active" : ""}`}
                onClick={() => switchEntity(entity)}
              >
                {entityLabels[entity].title}
                <span>{formatEntityCount(items, entity)}</span>
              </button>
            ))}
          </div>

          <label className="admin-search">
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, subtitle, tag, or source" />
          </label>

          {loadingList ? <div className="empty-state compact-empty">Loading curriculum records...</div> : null}
          {listError ? <div className="callout admin-message">{listError}</div> : null}

          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Item</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={`${item.entityType}-${item.id}`}
                  className={item.id === selectedId ? "admin-row-active" : ""}
                  onClick={() => openSelected(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSelected(item.id);
                    }
                  }}
                >
                  <td>{entityLabels[item.entityType].title}</td>
                  <td>
                    <strong>{item.title}</strong>
                    <p className="subtle-line">{item.subtitle}</p>
                  </td>
                  <td>
                    <div className="admin-tag-row">{renderTags(item.tags)}</div>
                    <p className="subtle-line">{item.sourceUrl}</p>
                  </td>
                </tr>
              ))}
              {!loadingList && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state compact-empty">No curriculum records match this filter.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {!loadingList && !listError ? (
            <p className="subtle-line admin-count-hint">
              Showing {filteredItems.length} {singularEntityLabels[selectedEntity]} records.
            </p>
          ) : null}
        </aside>

        <section className="admin-detail-panel panel">
          <div className="admin-detail-head">
            <div>
              <span className="section-eyebrow">Record inspector</span>
              <h2>{selectedListItem?.title ?? (draft ? "New record" : "Select a record")}</h2>
              <p className="subtle-line">{entityLabels[selectedEntity].subtitle}</p>
            </div>
            <div className="admin-detail-actions">
              {selectedDetail ? <span className="admin-detail-chip">{selectedDetail.record.sourceSnapshot ? "Snapshot available" : "No snapshot"}</span> : null}
              <button className="primary-button admin-save-button" disabled={!draft || saving} onClick={() => void handleSave()}>
                {saving ? "Saving..." : "Save record"}
              </button>
            </div>
          </div>

          {message ? <div className="callout admin-message">{message}</div> : null}

          {loadingDetail && selectedId ? <div className="empty-state compact-empty">Loading record...</div> : renderDetail()}
        </section>
      </main>
    </div>
  );
}