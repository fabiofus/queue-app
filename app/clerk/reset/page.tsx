import ResetForm from "../ResetForm";

export default function Page({ searchParams }: { searchParams: { slug?: string } }) {
  const slug = searchParams?.slug ?? "";
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-3">Reset contatore</h1>
      <ResetForm slug={slug} />
    </div>
  );
}

