import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <PageHeader title="Cadastrar produto" />
      <ProductForm />
    </div>
  );
}
