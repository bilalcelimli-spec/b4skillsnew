/**
 * CandidatePlayer — legacy alias for TestPlayer.
 * All logic now lives in TestPlayer which uses the real server-side IRT engine.
 * This shim exists only to avoid breaking any external references during the migration.
 */
import React from "react";
import { TestPlayer } from "./TestPlayer";

interface CandidatePlayerProps {
  organizationId: string;
  /** Legacy prop — treated as candidateId */
  sessionId: string;
  onComplete: (finalTheta: number) => void;
}

export const CandidatePlayer: React.FC<CandidatePlayerProps> = ({
  organizationId,
  sessionId,
  onComplete,
}) => (
  <TestPlayer
    organizationId={organizationId}
    candidateId={sessionId}
    onComplete={(theta, _sid) => onComplete(theta ?? 0)}
  />
);
