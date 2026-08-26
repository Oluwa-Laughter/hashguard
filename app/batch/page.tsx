"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BatchForm } from "@/components/batch-form";
function BatchContent() { const query = useSearchParams(); return <main className="shell max-w-3xl py-10"><BatchForm initial={query.get("payments") || undefined} /></main>; }
export default function BatchPage() { return <Suspense><BatchContent /></Suspense>; }
