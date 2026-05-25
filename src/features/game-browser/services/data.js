import fetchJson from "@/lib/fetch-json.js";

import { convertGameDataImageURLs } from "../lib/normalize.js";

const SubjectFileMap = {
  math: "Math",
  chinese: "Chinese",
  technology: "Technology",
};

export async function getJsonData(subjectLower, grade) {
  const cap = SubjectFileMap[subjectLower];
  const url = `./Grade${grade}/${cap}Grade${grade}.json`;
  const res = await fetchJson(url);
  return res.data;
}

export async function loadSubjectData(subjectLower, grade) {
  const raw = await getJsonData(subjectLower, grade);
  return await convertGameDataImageURLs(raw, grade);
}

export async function loadGlobalSearchData() {
  const grades = ["1", "2", "3", "4", "5", "6"];
  const subjects = ["math", "chinese", "technology"];
  const allData = [];
  for (const grade of grades) {
    for (const subject of subjects) {
      try {
        const data = await loadSubjectData(subject, grade);
        if (data && Array.isArray(data)) {
          allData.push({ grade, subject, data });
        }
      } catch {
        // 該年級/科目無資料，略過
      }
    }
  }
  return allData;
}
