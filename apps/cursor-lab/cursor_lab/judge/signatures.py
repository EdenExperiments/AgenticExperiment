"""DSPy signatures for capability scoring and process adherence."""

from __future__ import annotations

import dspy


class CapabilityScore(dspy.Signature):
    """Score the agent's output for ONE capability dimension."""

    capability: str = dspy.InputField(desc="e.g. refactor, command_running, code_gen")
    criterion: str = dspy.InputField(desc="Rubric criterion for this capability")
    artifact_summary: str = dspy.InputField(desc="What the rule/skill under test claims to do")
    user_input: str = dspy.InputField(desc="The prompt given to the agent")
    agent_result_text: str = dspy.InputField(desc="The agent's final result text")
    file_diff: str = dspy.InputField(desc="Unified diff of files in sandbox after the run")
    tool_event_summary: str = dspy.InputField(desc="Summarized tool-call sequence")

    score: float = dspy.OutputField(desc="0.0 to 1.0, calibrated against the rubric")
    confidence: float = dspy.OutputField(desc="0.0 to 1.0 judge self-confidence")
    rationale: str = dspy.OutputField(desc="2-4 sentence justification with concrete refs")


class ProcessAdherence(dspy.Signature):
    """Score how well the agent followed the artifact's prescribed process."""

    artifact_full_text: str = dspy.InputField()
    user_input: str = dspy.InputField()
    agent_result_text: str = dspy.InputField()
    tool_event_summary: str = dspy.InputField()

    adherence: float = dspy.OutputField(desc="0.0 to 1.0")
    deviations: list[str] = dspy.OutputField(desc="Concrete steps skipped or violated")
