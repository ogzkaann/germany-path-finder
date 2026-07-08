import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import type { Goal, Profile } from "../domain/types";
import { goalLabels } from "../domain/labels";
import { getProfile, saveProfile } from "../storage/repository";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Stepper } from "../components/Stepper";

const defaultProfile: Profile = {
  id: "local-profile",
  currentStatus: "",
  city: "Düsseldorf",
  state: "NRW",
  germanLevel: "B1",
  educationBackground: "",
  workExperience: "",
  goal: "ausbildung",
  updatedAt: new Date().toISOString(),
};

interface ProfileBuilderProps {
  onSaved: () => void;
}

function activeStep(profile: Profile) {
  if (!profile.currentStatus || !profile.city || !profile.state) return 0;
  if (!profile.educationBackground || !profile.workExperience) return 1;
  return 2;
}

export function ProfileBuilder({ onSaved }: ProfileBuilderProps) {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile().then((stored) => {
      if (stored) setProfile(stored);
    });
  }, []);

  function update(field: keyof Profile, value: string) {
    setSaved(false);
    setProfile((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    await saveProfile(profile);
    setSaved(true);
    onSaved();
  }

  return (
    <div className="grid gap-5 p-5 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <UserRound className="h-4 w-4" />
            Profile Builder
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">Turn your situation into reviewable context.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            This profile is local browser state. It helps retrieval and rules explain risk without becoming legal advice.
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save profile
        </Button>
      </div>

      <Stepper steps={["Status", "Background", "Goal"]} activeIndex={activeStep(profile)} />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Local profile</CardTitle>
            <CardDescription>Default location is Düsseldorf / NRW, editable for other regions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Current status / visa type
                <Input
                  value={profile.currentStatus}
                  placeholder="e.g. Chancenkarte, student, job seeker"
                  onChange={(event) => update("currentStatus", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                German level
                <Select value={profile.germanLevel} onChange={(event) => update("germanLevel", event.target.value)}>
                  {["None", "A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                City
                <Input value={profile.city} onChange={(event) => update("city", event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                State
                <Input value={profile.state} onChange={(event) => update("state", event.target.value)} />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium">
              Education background
              <Textarea
                value={profile.educationBackground}
                placeholder="Degree, field, university, ECTS, GPA, recognition notes..."
                onChange={(event) => update("educationBackground", event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Work experience
              <Textarea
                value={profile.workExperience}
                placeholder="Roles, duration, contract status, German employer details..."
                onChange={(event) => update("workExperience", event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Goal
              <Select value={profile.goal} onChange={(event) => update("goal", event.target.value as Goal)}>
                {Object.entries(goalLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Extracted profile JSON</CardTitle>
            <CardDescription>Reviewable fields from uploaded documents appear here after extraction.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              {JSON.stringify(profile.extracted ?? { status: "No extracted profile saved yet." }, null, 2)}
            </pre>
            {saved ? <p className="mt-3 text-sm font-medium text-emerald-700">Saved locally.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
