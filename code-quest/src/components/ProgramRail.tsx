import { Trash2, ChevronUp, ChevronDown, Plus, Minus } from "lucide-react";
import type { Chip, TraceStep } from "../game/interpreter";
import { chipCount, PROGRAM_CAP, REPEAT_BODY_CAP } from "../game/interpreter";
import { OpGlyph, OP_LABEL } from "./chipGlyph";
import { useStore, type Selection } from "../state/store";
import { sfx } from "../lib/sfx";

interface RailProps {
  program: Chip[];
  selection: Selection | null;
  activeStep: TraceStep | null; // for live highlight
  collisionStep: TraceStep | null; // failing chip lights red
  running: boolean;
}

// Which source chip id is currently executing (top-level + possibly a body chip).
function activeIds(step: TraceStep | null): string | null {
  return step ? step.sourceChipId : null;
}

export function ProgramRail({ program, selection, activeStep, collisionStep, running }: RailProps) {
  const select = useStore((s) => s.select);
  const releaseLoopLatch = useStore((s) => s.releaseLoopLatch);
  const loopLatch = useStore((s) => s.loopLatch);
  const deleteSelected = useStore((s) => s.deleteSelected);
  const moveSelected = useStore((s) => s.moveSelected);
  const setRepeatTimes = useStore((s) => s.setRepeatTimes);

  const count = chipCount(program);
  const liveId = activeIds(activeStep);
  const failId = collisionStep ? collisionStep.sourceChipId : null;

  const isSelected = (index: number, bodyIndex: number | null) =>
    selection?.index === index && selection?.bodyIndex === bodyIndex;

  const onSelect = (sel: Selection) => {
    if (running) return;
    sfx.tap();
    // toggle off if re-tapping the same chip
    if (isSelected(sel.index, sel.bodyIndex)) select(null);
    else select(sel);
  };

  // FIX 1: tap on empty rail area releases the latch.
  const onRailBackgroundClick = () => {
    if (running || !loopLatch) return;
    sfx.tapLow();
    releaseLoopLatch();
  };

  // FIX 1: which REPEAT is latched (if any), and is it full?
  const latchedRepeatIndex = loopLatch?.repeatIndex ?? null;
  const latchedChip = latchedRepeatIndex !== null ? program[latchedRepeatIndex] : null;
  const latchedBodyFull = latchedChip && latchedChip.op === "REPEAT" && latchedChip.body.length >= REPEAT_BODY_CAP;

  return (
    <div className="rail panel">
      <div className="rail-head">
        <span className="rail-title">PROGRAM</span>
        <span className={`chip-count${count >= PROGRAM_CAP ? " full" : ""}`}>
          {count}/{PROGRAM_CAP}
        </span>
      </div>

      {/* FIX 1: latch indicator bar shown when actively filling a loop */}
      {loopLatch !== null && !running && (
        <div className={`loop-latch-bar${latchedBodyFull ? " latch-full" : ""}`} role="status" aria-live="polite">
          <span className="latch-bar-dot" />
          <span>{latchedBodyFull ? "LOOP FULL — tapping falls back to top-level" : "ADDING INTO LOOP"}</span>
          <button
            type="button"
            className="latch-release-btn"
            onClick={() => { sfx.tapLow(); releaseLoopLatch(); }}
            aria-label="Stop adding into loop"
          >
            DONE
          </button>
        </div>
      )}

      <div className="rail-list" role="list" aria-label="Program chips" onClick={onRailBackgroundClick}>
        {program.length === 0 && (
          <div className="rail-empty">No chips loaded. Tap a command below to add it.</div>
        )}

        {program.map((chip, i) => {
          const topSelected = isSelected(i, null);
          if (chip.op === "REPEAT") {
            const repeatLive = liveId != null && chip.body.some((b) => b.id === liveId);
            const isLatched = latchedRepeatIndex === i;
          return (
              <div key={chip.id} className={`chip-group${isLatched ? " latch-target" : ""}`} role="listitem" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={`chip chip-repeat${topSelected ? " selected" : ""}${repeatLive ? " live" : ""}${isLatched ? " latch-active" : ""}`}
                  onClick={() => onSelect({ index: i, bodyIndex: null })}
                  aria-label={`REPEAT ${chip.times} times, chip ${i + 1}`}
                  aria-pressed={topSelected}
                >
                  {running && <span className="playhead" />}
                  <span className="chip-glyph"><OpGlyph op="REPEAT" /></span>
                  <span className="chip-label">REPEAT</span>
                  <span className="repeat-times">×{chip.times}</span>
                </button>

                {topSelected && !running && (
                  <div className="chip-toolbar repeat-toolbar">
                    <button className="icon-btn" aria-label="Fewer repeats"
                      onClick={() => { sfx.tap(); setRepeatTimes(i, Math.max(2, chip.times - 1) as 2 | 3 | 4 | 5); }}
                      disabled={chip.times <= 2}>
                      <Minus size={16} />
                    </button>
                    <span className="repeat-stepper-val">×{chip.times}</span>
                    <button className="icon-btn" aria-label="More repeats"
                      onClick={() => { sfx.tap(); setRepeatTimes(i, Math.min(5, chip.times + 1) as 2 | 3 | 4 | 5); }}
                      disabled={chip.times >= 5}>
                      <Plus size={16} />
                    </button>
                    <span className="toolbar-sep" />
                    <RailToolbarButtons onDelete={() => { sfx.tapLow(); deleteSelected(); }}
                      onUp={() => { sfx.tap(); moveSelected(-1); }}
                      onDown={() => { sfx.tap(); moveSelected(1); }} />
                  </div>
                )}

                {/* indented body */}
                <div className="repeat-body">
                  <span className="repeat-bracket" />
                  <div className="repeat-body-chips">
                    {chip.body.length === 0 && (
                      <div className="body-empty">Empty loop — select it, then add commands into the loop.</div>
                    )}
                    {chip.body.map((b, bi) => {
                      const bSelected = isSelected(i, bi);
                      const bLive = liveId === b.id && running;
                      const bFail = failId === b.id;
                      return (
                        <div key={b.id} className="body-chip-row">
                          <button
                            type="button"
                            className={`chip chip-body${bSelected ? " selected" : ""}${bLive ? " live" : ""}${bFail ? " failed" : ""}`}
                            onClick={() => onSelect({ index: i, bodyIndex: bi })}
                            aria-label={`${OP_LABEL[b.op]}, loop step ${bi + 1}`}
                            aria-pressed={bSelected}
                          >
                            {bLive && <span className="playhead" />}
                            <span className="chip-glyph"><OpGlyph op={b.op} size={20} /></span>
                            <span className="chip-label">{OP_LABEL[b.op]}</span>
                          </button>
                          {bSelected && !running && (
                            <div className="chip-toolbar">
                              <RailToolbarButtons onDelete={() => { sfx.tapLow(); deleteSelected(); }}
                                onUp={() => { sfx.tap(); moveSelected(-1); }}
                                onDown={() => { sfx.tap(); moveSelected(1); }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // simple chip
          const live = liveId === chip.id && running;
          const failed = failId === chip.id;
          return (
            <div key={chip.id} className="chip-row" role="listitem" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`chip${topSelected ? " selected" : ""}${live ? " live" : ""}${failed ? " failed" : ""}`}
                onClick={() => onSelect({ index: i, bodyIndex: null })}
                aria-label={`${OP_LABEL[chip.op]}, chip ${i + 1}`}
                aria-pressed={topSelected}
              >
                {live && <span className="playhead" />}
                <span className="chip-glyph"><OpGlyph op={chip.op} /></span>
                <span className="chip-label">{OP_LABEL[chip.op]}</span>
              </button>
              {topSelected && !running && (
                <div className="chip-toolbar">
                  <RailToolbarButtons onDelete={() => { sfx.tapLow(); deleteSelected(); }}
                    onUp={() => { sfx.tap(); moveSelected(-1); }}
                    onDown={() => { sfx.tap(); moveSelected(1); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RailToolbarButtons({ onDelete, onUp, onDown }: { onDelete: () => void; onUp: () => void; onDown: () => void }) {
  return (
    <>
      <button className="icon-btn" aria-label="Move chip up" onClick={onUp}><ChevronUp size={18} /></button>
      <button className="icon-btn" aria-label="Move chip down" onClick={onDown}><ChevronDown size={18} /></button>
      <button className="icon-btn danger" aria-label="Delete chip" onClick={onDelete}><Trash2 size={18} /></button>
    </>
  );
}
