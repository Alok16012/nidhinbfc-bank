"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERMISSION_GROUPS, ROLE_PRESETS, type Permission } from "@/lib/permissions";

interface PermissionEditorProps {
  roleName: string;
  onRoleNameChange: (name: string) => void;
  permissions: Permission[];
  onPermissionsChange: (permissions: Permission[]) => void;
  /** Role names already used by other staff, offered as suggestions. */
  knownRoles?: string[];
}

/** Role name you type yourself plus a tick-list of what that role can do. */
export function PermissionEditor({
  roleName, onRoleNameChange, permissions, onPermissionsChange, knownRoles = [],
}: PermissionEditorProps) {
  const has = (p: Permission) => permissions.includes(p);
  const toggle = (p: Permission) =>
    onPermissionsChange(has(p) ? permissions.filter((x) => x !== p) : [...permissions, p]);
  const setGroup = (keys: readonly Permission[], on: boolean) =>
    onPermissionsChange(on ? Array.from(new Set([...permissions, ...keys])) : permissions.filter((x) => !keys.includes(x)));

  const suggestions = Array.from(new Set([...ROLE_PRESETS.map((r) => r.name), ...knownRoles])).filter(Boolean);

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Role name *</label>
        <input
          required
          list="role-name-suggestions"
          value={roleName}
          onChange={(e) => onRoleNameChange(e.target.value)}
          placeholder="e.g. Cashier, Field Agent, Loan Officer"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <datalist id="role-name-suggestions">
          {suggestions.map((r) => <option key={r} value={r} />)}
        </datalist>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Start from a preset <span className="font-normal text-slate-400">(optional, you can change the ticks after)</span></p>
        <div className="flex flex-wrap gap-2">
          {ROLE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                onPermissionsChange([...preset.permissions]);
                if (!roleName.trim()) onRoleNameChange(preset.name);
              }}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {preset.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPermissionsChange([])}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50"
          >
            Clear all
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">
          What can they access? <span className="font-normal text-slate-400">({permissions.length} selected)</span>
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PERMISSION_GROUPS.map((group) => {
            const keys = group.permissions.map((p) => p.key) as Permission[];
            const count = keys.filter(has).length;
            return (
              <div key={group.module} className={cn("rounded-xl border p-3", count ? "border-blue-200 bg-blue-50/40" : "border-slate-200")}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{group.module}</p>
                  <button
                    type="button"
                    onClick={() => setGroup(keys, count < keys.length)}
                    className="text-[11px] font-medium text-blue-600 hover:underline"
                  >
                    {count < keys.length ? "Select all" : "None"}
                  </button>
                </div>
                <div className="space-y-1">
                  {group.permissions.map((perm) => (
                    <label key={perm.key} className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-sm text-slate-700 hover:bg-white">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          has(perm.key) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                        )}
                      >
                        {has(perm.key) && <Check className="h-3 w-3" />}
                      </span>
                      <input type="checkbox" className="sr-only" checked={has(perm.key)} onChange={() => toggle(perm.key)} />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
