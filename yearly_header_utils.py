from __future__ import annotations

from typing import Iterable, Mapping
import re


_PRIMARY_SPACING_RE = re.compile(r"\s+")
_PUNCT_RE = re.compile(r"[\(\)\[\]\{\},.;:\/\\\-]+")
_LEADING_STAR_RE = re.compile(r"^\*\s*")


def normalize_header(value: object) -> str:
    if value is None:
        return ""
    text = str(value).replace("\xa0", " ").strip().lower()
    text = _LEADING_STAR_RE.sub("", text)
    text = _PRIMARY_SPACING_RE.sub(" ", text)
    text = text.replace("&", " and ")
    text = _PUNCT_RE.sub(" ", text)
    text = _PRIMARY_SPACING_RE.sub(" ", text).strip()
    return text


HEADER_GROUPS: dict[str, tuple[str, ...]] = {
    "No.": ("No.", "No. "),
    "Date of Intake Interview": ("Date of Intake Interview",),
    "Child Code": ("Child Code",),
    "Batch Number": ("Batch Number",),
    "Province": ("Province",),
    "City/ Municipality": ("City/ Municipality", "edited_City/ Municipality", "Municipality/ City"),
    "Barangay": ("*Barangay", "Barangay"),
    "Sitio/ Phase": ("*Sitio/ Phase", "*Sitio Phase", "Sitio/ Phase", "Sitio Phase"),
    "Complete Address": ("*Complete Address", "Complete Address"),
    "Child's Surname": ("*Child's Surname", "Child's Surname"),
    "Child's First Name": ("*Child's First Name", "Child's First Name"),
    "Middle Initial": ("*Middle Initial", "Middle Initial"),
    "Sex/ Gender": ("* Sex/ Gender", "Sex/ Gender", "Sex"),
    "Date of Birth": ("*Date of Birth", "Date of Birth"),
    "Age": ("*Age", "Age", "Age (with formula)", "Edad"),
    "Family Per Capita Income": ("*Family Per Capita Income", "Family Per Capita Income", "pci below 800"),
    "Grade/ Year Level": ("*Grade/ Year Level", "*Grade/ Year Level SY2020-21", "Grade/ Year Level", "Grade/ Year Level SY2020-21"),
    "Name of School": ("*Name of School", "Name of School"),
    "Child's Classification upon Admission": ("*Child's Classification upon Admission", "Child's Classification upon Admission"),
    "Children in Need of Special Protection (CNSP Cluster)": (
        "Children in Need of Special Protection ( CNSP Cluster)",
        "Children in Need of Special Protection (CNSP Cluster)",
    ),
    "Course in College": ("Course in College", "Course (for College Students)"),
    "Track for Senior High": ("Track for Senior High", "Track/Strand (for Senior High Students)"),
    "Name of Welfare Agency": ("Name of  Welfare Agency", "Name of Welfare Agency"),
    "Type of Service Availed": ("Type of type service Availed", "Type of service Availed", "Type of service availed", "Type of service Availed"),
    "Presently Served by Welfare Agency": ("Presently served by welfare agency",),
    "Type of Organization": ("Type of Organization",),
    "Type of Scheme/ Implementation": ("Type of Scheme/ Implementation ", "Type of Scheme/ Implementation"),
    "Social Protection Program": ("Social Protection  Program Affiliation ", "Social Protection Program Affiliation", "Social Protection: Others"),
    "Name of Tie-up Partner": ("Name of Tie-up Partner",),
    "Staff In-Charge": ("Staff In- Charge", "Staff In-Charge"),
    "Name of Funder": ("Name of Funder     [for Finance Section]", "Name of Funder"),
    "Occupation of HH Head": ("Occupation of HH Head",),
    "HH Head First Name": (
        "HH Head: First Name",
        "HH Head: First Name ( Mother)",
        "HH Head: First Name (Mother)",
        "HH Head: First Name(father)",
        "HH Head: First Name(mother)",
    ),
    "HH Head Surname": (
        "HH Head: Surname",
        "HH Head: Surname ( Mother)",
        "HH Head: Surname (Mother)",
        "HH Head: Surname(father)",
        "HH Head: Surname(mother)",
    ),
    "HH Head MI": ("HH Head: MI",),
    "House Ownership": ("HC: House Ownership", "HC: House Ownership: If others, specify", "HC: House Ownership: Others"),
    "Size of Dwelling": ("Size of Dwelling",),
    "Materials": ("Materials", "Materials: Others", "Materials:Others", "Materials: If others, specify"),
    "Water Supply": ("Water Supply", "Water Supply: Others", "Water Supply: If others, specify"),
    "Lighting Facilities": ("Lighting Facilities", "Lighting Facilities: Others", "Lighting Facilities: If others, specify"),
    "Toilet Facility": ("Toilet Facility", "Toilet Facility: Others", "Toilet Facility: If others, specify"),
    "Furniture/s": ("Furniture/s",),
    "Education Status": ("Education Status", "Child's Education  Status  (as ERDA Beneficiary)"),
    "Reason for being Inactive": (
        "Reason for being Inactive",
        "Others Please Specify/Reason/s why child lost interest",
    ),
    "Graduate Remarks": ("Graduate_Remarks",),
    "Dropped Out Past 4 Months": ("Did the child drop out from school for the past four months",),
    "Reason for Dropping Out": (
        "Reason for dropping out",
        "Reason for dropping out: Others",
        "Reason/s for Dropping out ( Remarks from Teachers of POs/ SDWs",
    ),
    "Dropout Month": ("Specific Month of dropping out from School ( Please indicate Month and Year)",),
    "School Awards": ("School Awards received by the child        non-academic/ academic-end of SY",),
    "School Activities": ("School Activities Attended  by the Child",),
    "School Organization Membership": ("Membership to school organization/s", "Membership in any organization"),
    "Capacity Building Activities": ("Capacity Building  Activities Attended by the child within the community",),
    "Math Grade": ("Math Grade    ( 1st Grading Period)       For Children attending dear and mathemagica",),
    "General Average": ("General Average       For Children attending dear and mathemagica",),
    "Reading Skills Pre": ("Level of Reading Skills (Pre- assessment) for Children Attending dear and mathemagica)",),
    "Reading Skills Post": ("Level of Reading Skills (Post -assessment)",),
    "NC/COC": ("NC/COC",),
    "Enrolled and Assisted Current SY": ("Enrolled and Assisted in the Current SY",),
    "Date of Visit": (" Date of Visit (format: month, day, year)",),
    "Assistance - Social Protection": ("Assistance  availed or received: (Social Protection)",),
    "Assistance - Educational": ("Type of assistance received by the child from ERDA ( Educational Assistance)",),
    "Assistance Visit Date": ("When did the child  received the Assistance   ( Specify Month)", "When did the child  availed or received the Assistance   ( Specify Month & year)"),
    "Assistance Remarks": ("Remarks",),
    "Location for Reporting": ("Location for Reporting",),
    "Religion": ("Religion",),
    "Type of Scheme": ("Type of Scheme/ Implementation ",),
    "Lookup Y5": ("lookup y5",),
}


def _build_lookup(groups: Mapping[str, Iterable[str]]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for canonical, aliases in groups.items():
        for alias in aliases:
            lookup[normalize_header(alias)] = canonical
        lookup[normalize_header(canonical)] = canonical
    return lookup


HEADER_LOOKUP = _build_lookup(HEADER_GROUPS)


def canonical_header(value: object) -> str:
    return HEADER_LOOKUP.get(normalize_header(value), "")


def is_known_header(value: object) -> bool:
    return bool(canonical_header(value))


def find_header_index(headers: list[object], *candidates: str) -> int | None:
    normalized = {normalize_header(header): index for index, header in enumerate(headers)}
    for candidate in candidates:
        candidate_key = normalize_header(candidate)
        if candidate_key in normalized:
            return normalized[candidate_key]
    return None


def header_values(headers: list[object], row: Iterable[object], *candidates: str) -> object:
    index = find_header_index(headers, *candidates)
    if index is None:
        return None
    values = list(row)
    if index >= len(values):
        return None
    return values[index]
