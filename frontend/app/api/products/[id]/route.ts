import { NextResponse } from "next/server";
import { mockProducts } from "@/lib/mockData";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const productIndex = mockProducts.findIndex((p) => p.id === params.id);
    
    if (productIndex === -1) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update existing product
    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...body,
    };

    return NextResponse.json(mockProducts[productIndex]);
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
