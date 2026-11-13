"use server";
// Things the page can ask the server to do.

import { refresh } from "next/cache";
import { getDb } from "@/db/client";
import { runFetch } from "@/jobs/run-fetch";

/** The "Fetch deals now" button: pull from every source, then redraw the page. */
export async function fetchNow() {
  const report = await runFetch(await getDb());
  console.log("fetch report", report);
  refresh();
}
