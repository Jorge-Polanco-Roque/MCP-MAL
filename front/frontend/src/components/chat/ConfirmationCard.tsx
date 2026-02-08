import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ConfirmationPayload } from "@/lib/types";

interface ConfirmationCardProps {
  confirmation: ConfirmationPayload;
  onRespond: (approved: boolean) => void;
  responded?: boolean;
}

const TOOL_LABELS: Record<string, { label: string; warning: string }> = {
  mal_delete_skill: {
    label: "Delete Skill",
    warning: "This will permanently delete the skill and its SKILL.md asset. This action cannot be undone.",
  },
  mal_delete_project: {
    label: "Delete Project",
    warning: "This will permanently delete the project. If cascade is enabled, all associated sprints and work items will also be deleted.",
  },
  mal_import_catalog: {
    label: "Import Catalog",
    warning: "This will merge/overwrite catalog data from the provided JSON. Existing entries with the same ID may be modified.",
  },
  mal_execute_command: {
    label: "Execute Command",
    warning: "This will execute a shell command on the server. Review the arguments carefully before proceeding.",
  },
};

function formatArgValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "-";
  return JSON.stringify(value);
}

export function ConfirmationCard({
  confirmation,
  onRespond,
  responded,
}: ConfirmationCardProps) {
  const meta = TOOL_LABELS[confirmation.tool_name] ?? {
    label: confirmation.tool_name,
    warning: "This is a destructive operation that may not be reversible.",
  };

  const args = confirmation.arguments ?? {};
  const argEntries = Object.entries(args).filter(
    ([k]) => k !== "type" && k !== "destructive_tool_confirmation"
  );

  return (
    <div className="my-2 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <span className="font-semibold text-yellow-800">Confirmation Required</span>
        <Badge variant="warning">{meta.label}</Badge>
      </div>

      {/* Warning */}
      <p className="text-yellow-700 mb-3">{meta.warning}</p>

      {/* Arguments */}
      {argEntries.length > 0 && (
        <div className="mb-3 rounded-md bg-white border border-yellow-200 p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Arguments</p>
          <div className="space-y-1">
            {argEntries.map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="font-mono text-gray-500">{key}:</span>
                <span className="text-gray-800">{formatArgValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      {!responded ? (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRespond(true)}
            className="gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRespond(false)}
            className="gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Responded
          </Badge>
        </div>
      )}
    </div>
  );
}
