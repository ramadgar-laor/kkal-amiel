// Shared "required field" marker: a red asterisk after the label. Pair it
// with the matching note ("* שדות המסומנים בכוכבית הם שדות חובה") near the
// top of the form. This is the house convention for every form in the
// system — established in the registration form, applied here too.
export function Required() {
  return (
    <span className="text-red-600" aria-hidden="true">
      {" "}
      *
    </span>
  );
}
