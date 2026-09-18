import { NextResponse } from "next/server";
import { mockProducts } from "@/lib/mockData";
import { Product } from "@/components/ProductCard";

export async function GET() {
  return NextResponse.json(mockProducts);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newProduct: Product = {
      id: Date.now().toString(),
      title: body.title || "New Product",
      basePrice: Number(body.basePrice) || 0,
      margin: Number(body.margin) || 0,
      features: body.features || [],
      setupLink: body.setupLink || "",
      feedbackLink: body.feedbackLink || "",
      isArchived: body.isArchived || false,
    };
    
    mockProducts.push(newProduct);
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
