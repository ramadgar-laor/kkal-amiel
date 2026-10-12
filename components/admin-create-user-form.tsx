"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUser } from "@/lib/actions/admin";
import {
  createUserSchema,
  STAFF_ROLES,
  type CreateUserInput,
} from "@/lib/validation/admin";

const ROLE_LABEL: Record<string, string> = {
  kkal: 'קק"ל',
  amiel: "עמיאל",
  admin: "מנהל מערכת",
};

export function AdminCreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "kkal" },
  });

  async function onSubmit(values: CreateUserInput) {
    setServerError(null);
    const res = await createUser(values);
    if (res.error) {
      setServerError(res.error);
      return;
    }
    setCreatedEmail(values.email);
    reset({ role: "kkal", email: "", password: "", displayName: "" });
    router.refresh();
  }

  const inputClass =
    "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-(--color-brand)";
  const labelClass = "block text-sm font-medium mb-1";
  const errorClass = "text-xs text-red-600 mt-1";

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setCreatedEmail(null);
        }}
        className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition"
      >
        + הוספת משתמש
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-black/5 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-(--color-brand-dark)">
          הוספת משתמש חדש
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-black/50 hover:text-black/80"
        >
          סגירה
        </button>
      </div>

      <p className="text-xs text-black/50">
        לשליחים אין צורך ליצור משתמש כאן — הם נרשמים בעצמם בעמוד ההרשמה
        ומתחברים באמצעות קישור כניסה למייל, ללא סיסמה. הטופס הזה מיועד ליצירת
        משתמשי צוות (קק&quot;ל / עמיאל / מנהל מערכת) בלבד.
      </p>

      {createdEmail && (
        <div className="rounded-md bg-(--color-accent-light) text-(--color-accent-dark) text-sm px-3 py-2">
          המשתמש {createdEmail} נוצר בהצלחה. יש להעביר לו את הסיסמה שהוגדרה
          בטופס בדרך מאובטחת — המערכת לא שולחת אותה אוטומטית.
        </div>
      )}
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>אימייל</label>
            <input type="email" className={inputClass} {...register("email")} />
            {errors.email && <p className={errorClass}>שדה חובה</p>}
          </div>
          <div>
            <label className={labelClass}>שם לתצוגה</label>
            <input className={inputClass} {...register("displayName")} />
          </div>
          <div>
            <label className={labelClass}>סיסמה זמנית</label>
            <input
              type="text"
              className={inputClass}
              {...register("password")}
            />
            {errors.password && (
              <p className={errorClass}>סיסמה חייבת להיות באורך 8 תווים לפחות</p>
            )}
          </div>
          <div>
            <label className={labelClass}>הרשאה</label>
            <select className={inputClass} {...register("role")}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-(--color-brand) text-white text-sm font-medium px-4 py-2 hover:bg-(--color-brand-dark) transition disabled:opacity-60"
        >
          {isSubmitting ? "יוצר..." : "יצירת משתמש"}
        </button>
      </form>
    </div>
  );
}
