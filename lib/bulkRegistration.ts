import * as XLSX from 'xlsx';

export interface BulkStudent {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | '';
  dob: string; // YYYY-MM-DD
  age: number;
  category: string;
  fideId: string;
  errors: string[];
}

export interface BulkCoordinator {
  schoolName: string;
  patronName: string;
  email: string;
  phoneNumber: string;
  consentGiven: boolean;
}

export interface ParseResult {
  success: boolean;
  students: BulkStudent[];
  errorCount: number;
  warnings: string[];
  error?: string;
}

export const DEFAULT_TOURNAMENT_CATEGORIES = [
  'Open Section (FIDE Rated)',
  'Ladies / Women Section',
  'Junior Under 18 (U18)',
  'Junior Under 16 (U16)',
  'Junior Under 14 (U14)',
  'Junior Under 12 (U12)',
  'Junior Under 10 (U10)',
  'Junior Under 8 (U8)',
  'PWD / DAP Section (FREE Entrance)',
];

/**
 * Accurately calculate age from YYYY-MM-DD string
 */
export function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

/**
 * Formats a Date object or string to YYYY-MM-DD
 */
export function formatDateToIso(dateVal: any): string {
  if (!dateVal) return '';

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal.toISOString().split('T')[0];
  }

  if (typeof dateVal === 'number') {
    // Excel serial number to JS Date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + dateVal * 86400000);
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split('T')[0];
    }
  }

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
      const parts = trimmed.split('-');
      const yyyy = parts[0];
      const mm = parts[1].padStart(2, '0');
      const dd = parts[2].padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dmy) {
      const dd = dmy[1].padStart(2, '0');
      const mm = dmy[2].padStart(2, '0');
      const yyyy = dmy[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    // Fallback Date parser
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }

  return '';
}

/**
 * Normalize category string to match available tournament categories
 */
export function matchCategory(inputCategory: string, availableCategories: string[]): string {
  if (!inputCategory) return '';
  const trimmed = inputCategory.trim();
  const lower = trimmed.toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = availableCategories.find(c => c.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Fuzzy checks for Junior age groups (U8, U10, U12, U14, U16, U18)
  const uMatch = lower.match(/\b(u-?\s*(\d{1,2}))\b/);
  if (uMatch) {
    const ageNum = uMatch[2];
    const matched = availableCategories.find(c => c.toLowerCase().includes(`u${ageNum}`) || c.toLowerCase().includes(`under ${ageNum}`));
    if (matched) return matched;
  }

  // 3. Open Section
  if (lower.includes('open')) {
    const openCat = availableCategories.find(c => c.toLowerCase().includes('open'));
    if (openCat) return openCat;
  }

  // 4. Ladies / Women
  if (lower.includes('ladi') || lower.includes('women') || lower.includes('girl') || lower.includes('female')) {
    const ladiesCat = availableCategories.find(c => c.toLowerCase().includes('ladi') || c.toLowerCase().includes('women'));
    if (ladiesCat) return ladiesCat;
  }

  // 5. PWD / DAP
  if (lower.includes('pwd') || lower.includes('dap') || lower.includes('disab')) {
    const pwdCat = availableCategories.find(c => c.toLowerCase().includes('pwd') || c.toLowerCase().includes('dap'));
    if (pwdCat) return pwdCat;
    return 'PWD / DAP Section (FREE Entrance)';
  }

  return trimmed;
}

/**
 * Validate a single student record
 */
export function validateStudent(student: BulkStudent, availableCategories: string[], allStudents: BulkStudent[]): string[] {
  const errors: string[] = [];

  if (!student.firstName || student.firstName.trim().length === 0) {
    errors.push('First Name is required');
  }
  if (!student.lastName || student.lastName.trim().length === 0) {
    errors.push('Last Name is required');
  }
  if (!student.gender || (student.gender !== 'Male' && student.gender !== 'Female')) {
    errors.push('Gender must be Male or Female');
  }

  if (!student.dob) {
    errors.push('Date of Birth is required (YYYY-MM-DD)');
  } else {
    const birthDate = new Date(student.dob);
    const today = new Date();
    if (isNaN(birthDate.getTime()) || birthDate > today || birthDate.getFullYear() < 1920) {
      errors.push('Invalid Date of Birth');
    }
  }

  if (!student.category) {
    errors.push('Category is required');
  } else {
    const isPwd = student.category.toLowerCase().includes('pwd') || student.category.toLowerCase().includes('dap');
    if (!isPwd && !availableCategories.some(c => c.toLowerCase() === student.category.toLowerCase())) {
      errors.push(`Category "${student.category}" does not match tournament sections`);
    }
  }

  // FIDE ID is mandatory (enter 00 if none)
  if (!student.fideId || student.fideId.trim().length === 0) {
    errors.push('FIDE ID is required (enter 00 if none)');
  }

  // Check Junior age ceiling warnings/errors
  if (student.category && student.dob) {
    const age = calculateAge(student.dob);
    const catLower = student.category.toLowerCase();
    const uMatch = catLower.match(/\bu-?(\d{1,2})\b/) || catLower.match(/under\s*(\d{1,2})/);
    if (uMatch) {
      const maxAge = parseInt(uMatch[1], 10);
      if (age > maxAge) {
        errors.push(`Age ${age} exceeds category limit (${student.category})`);
      }
    }
  }

  // Intra-batch duplicate check
  const duplicate = allStudents.find(other => 
    other.id !== student.id &&
    other.firstName.trim().toLowerCase() === student.firstName.trim().toLowerCase() &&
    other.lastName.trim().toLowerCase() === student.lastName.trim().toLowerCase() &&
    other.dob === student.dob
  );
  if (duplicate) {
    errors.push('Duplicate player detected in this batch');
  }

  return errors;
}

/**
 * Parse an Excel (.xlsx / .xls) or CSV file in the browser
 */
export async function parseStudentSpreadsheet(file: File, availableCategories: string[]): Promise<ParseResult> {
  const categories = availableCategories && availableCategories.length > 0 ? availableCategories : DEFAULT_TOURNAMENT_CATEGORIES;

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, students: [], errorCount: 0, warnings: [], error: 'The uploaded file has no sheets.' };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { success: false, students: [], errorCount: 0, warnings: [], error: 'No data rows found in the spreadsheet.' };
    }

    const students: BulkStudent[] = [];
    const warnings: string[] = [];

    // Helper to find value from row by flexible column names
    const getField = (row: Record<string, any>, candidates: string[]): any => {
      const keys = Object.keys(row);
      for (const candidate of candidates) {
        const foundKey = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          return row[foundKey];
        }
      }
      return '';
    };

    rawRows.forEach((row, index) => {
      // Ignore completely empty rows
      const hasAnyValue = Object.values(row).some(v => String(v).trim() !== '');
      if (!hasAnyValue) return;

      const rawFirstName = String(getField(row, ['first name', 'firstname', 'first_name', 'first', 'given name'])).trim();
      const rawLastName = String(getField(row, ['last name', 'lastname', 'last_name', 'surname', 'other names', 'other_names', 'family name'])).trim();
      const rawGender = String(getField(row, ['gender', 'sex'])).trim();
      const rawDob = getField(row, ['date of birth', 'dob', 'birth date', 'birthdate', 'd.o.b', 'date_of_birth']);
      const rawCategory = String(getField(row, ['category', 'section', 'group', 'tournament category'])).trim();
      
      // Flexible FIDE ID header extraction (matches "FIDE ID (Optional)", "FIDE ID (Enter 00 if none)", "FIDE Number", etc.)
      let rawFideIdVal = getField(row, [
        'fide id (enter 00 if none)',
        'fide id (optional)',
        'fide id',
        'fide_id',
        'fide',
        'fide no',
        'fide number',
        'fide id #',
        'fideid',
      ]);
      if (!rawFideIdVal) {
        const keys = Object.keys(row);
        const fideKey = keys.find(k => k.trim().toLowerCase().includes('fide'));
        if (fideKey && row[fideKey] !== undefined && row[fideKey] !== null) {
          rawFideIdVal = row[fideKey];
        }
      }
      const rawFideIdStr = String(rawFideIdVal !== undefined && rawFideIdVal !== null ? rawFideIdVal : '').trim();
      // If student has FIDE ID in Excel, prefill it; if empty or missing, default to '00'
      const rawFideId = rawFideIdStr || '00';

      // Normalize gender
      let gender: 'Male' | 'Female' | '' = '';
      const gLower = rawGender.toLowerCase();
      if (gLower.startsWith('m') || gLower === 'boy') {
        gender = 'Male';
      } else if (gLower.startsWith('f') || gLower === 'girl' || gLower === 'woman' || gLower === 'lady') {
        gender = 'Female';
      }

      const dob = formatDateToIso(rawDob);
      const age = calculateAge(dob);
      const matchedCat = matchCategory(rawCategory, categories);

      const student: BulkStudent = {
        id: `row-${index + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        firstName: rawFirstName,
        lastName: rawLastName,
        gender,
        dob,
        age,
        category: matchedCat,
        fideId: rawFideId,
        errors: [],
      };

      students.push(student);
    });

    if (students.length === 0) {
      return { success: false, students: [], errorCount: 0, warnings: [], error: 'Could not extract any student rows from the sheet. Please ensure column headers match the template.' };
    }

    // Run validations across all students
    let totalErrors = 0;
    students.forEach(student => {
      student.errors = validateStudent(student, categories, students);
      if (student.errors.length > 0) {
        totalErrors += student.errors.length;
      }
    });

    return {
      success: true,
      students,
      errorCount: totalErrors,
      warnings,
    };
  } catch (err: any) {
    console.error('Error parsing spreadsheet:', err);
    return {
      success: false,
      students: [],
      errorCount: 0,
      warnings: [],
      error: err.message || 'Failed to read spreadsheet. Please check the file format.',
    };
  }
}

/**
 * Trigger download of official Excel template (.xlsx)
 */
export function downloadExcelTemplate(categories?: string[], tournamentName?: string) {
  const cats = categories && categories.length > 0 ? categories : DEFAULT_TOURNAMENT_CATEGORIES;

  const templateRows = [
    {
      'First Name': 'Brian',
      'Last Name': 'Otieno',
      'Gender': 'Male',
      'Date of Birth': '2012-05-14',
      'Category': cats[3] || 'Junior Under 14 (U14)',
      'FIDE ID (Enter 00 if none)': '1083421',
    },
    {
      'First Name': 'Faith',
      'Last Name': 'Wanjiku',
      'Gender': 'Female',
      'Date of Birth': '2014-09-22',
      'Category': cats[4] || 'Junior Under 12 (U12)',
      'FIDE ID (Enter 00 if none)': '00',
    },
    {
      'First Name': 'Samuel',
      'Last Name': 'Mutua',
      'Gender': 'Male',
      'Date of Birth': '2008-01-10',
      'Category': cats[1] || 'Junior Under 18 (U18)',
      'FIDE ID (Enter 00 if none)': '1092834',
    }
  ];

  const wb = XLSX.utils.book_new();

  // Sheet 1: Roster Template
  const wsRoster = XLSX.utils.json_to_sheet(templateRows);
  // Set column widths
  wsRoster['!cols'] = [
    { wch: 18 }, // First Name
    { wch: 18 }, // Last Name
    { wch: 12 }, // Gender
    { wch: 16 }, // Date of Birth
    { wch: 32 }, // Category
    { wch: 28 }, // FIDE ID (Enter 00 if none)
  ];
  XLSX.utils.book_append_sheet(wb, wsRoster, 'Student Roster');

  // Sheet 2: Available Categories Guide
  const guideRows = cats.map((cat, i) => ({
    '#': i + 1,
    'Available Category': cat,
    'Note': cat.toLowerCase().includes('pwd') ? 'FREE Entrance' : 'Standard Entry Fee applies'
  }));
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 6 }, { wch: 36 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Categories Guide');

  const fileName = tournamentName 
    ? `${tournamentName.replace(/[^a-zA-Z0-9]/g, '_')}_Bulk_Registration_Template.xlsx`
    : 'JumuiaChess_Bulk_Registration_Template.xlsx';

  XLSX.writeFile(wb, fileName);
}

/**
 * Trigger download of official CSV template (.csv)
 */
export function downloadCsvTemplate(categories?: string[]) {
  const cats = categories && categories.length > 0 ? categories : DEFAULT_TOURNAMENT_CATEGORIES;
  const sampleCat1 = cats[3] || 'Junior Under 14 (U14)';
  const sampleCat2 = cats[4] || 'Junior Under 12 (U12)';

  const csvContent = [
    'First Name,Last Name,Gender,Date of Birth,Category,FIDE ID (Enter 00 if none)',
    `Brian,Otieno,Male,2012-05-14,"${sampleCat1}",1083421`,
    `Faith,Wanjiku,Female,2014-09-22,"${sampleCat2}",00`,
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'JumuiaChess_Bulk_Registration_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Calculate financial total and counts for bulk registrations
 */
export function calculateBulkTotal(students: BulkStudent[], baseFee: number) {
  let payingCount = 0;
  let freeCount = 0;
  let totalAmount = 0;

  const categoryBreakdown: Record<string, { count: number; fee: number }> = {};

  students.forEach(s => {
    const isPwd = s.category.toLowerCase().includes('pwd') || s.category.toLowerCase().includes('dap');
    const fee = isPwd ? 0 : baseFee;

    if (fee === 0) {
      freeCount++;
    } else {
      payingCount++;
      totalAmount += fee;
    }

    if (!categoryBreakdown[s.category]) {
      categoryBreakdown[s.category] = { count: 0, fee: 0 };
    }
    categoryBreakdown[s.category].count++;
    categoryBreakdown[s.category].fee += fee;
  });

  return {
    totalStudents: students.length,
    payingCount,
    freeCount,
    totalAmount,
    breakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
      category,
      count: data.count,
      fee: data.fee,
    })),
  };
}
