import { resetCounterAction } from "./actions";

export default function ResetForm({ slug }: { slug: string }) {
  return (
    <form action={resetCounterAction} className="p-4 flex gap-2 border rounded">
      <input
        name="slug"
        defaultValue={slug}
        className="border px-2 py-1"
        placeholder="slug reparto"
      />
      <button className="border rounded px-3 py-1">Reset contatore</button>
    </form>
  );
}

