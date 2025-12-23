"""
CSV to JSON Data Processing Script

Processes CSV files with Italian professional figures data and generates
hierarchical JSON files mapping sectors, figures, ADAs, and their associated
skills/knowledge.

The CSV has a transposed format where:
- Columns = Professional figures (denominazione figura)
- Rows = Attributes for each figure
"""

import csv
import json
import re
from collections import defaultdict
from pathlib import Path


def clean_sector_name(sector: str) -> str:
    """Remove parenthetical codes like '(42)' from sector names and clean whitespace."""
    if not sector:
        return ""
    # Remove codes in parentheses at the end like "(42)" or "(1)"
    cleaned = re.sub(r"\s*\(\d+\)\s*$", "", sector.strip())
    return cleaned.strip()


def clean_value(value: str) -> str:
    """Clean whitespace and newlines from a value."""
    if not value:
        return ""
    return " ".join(value.split())


def parse_csv(filepath: Path) -> dict:
    """
    Parse a transposed CSV file and extract structured data.
    
    Returns a dictionary with:
    - figures: dict mapping figure name to its data
    - sectors: set of unique sector names
    """
    with open(filepath, encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    if not rows:
        return {"figures": {}, "sectors": set()}
    
    # First row contains figure names (header row)
    header = rows[0]
    figure_names = header[1:]  # Skip the first column which is the row label
    
    # Initialize data structures
    figures = {}
    for i, name in enumerate(figure_names):
        if name.strip():
            figures[name.strip()] = {
                "column_index": i + 1,  # +1 because we skip the label column
                "settore": "",
                "descrizione": "",
                "adas": [],  # List of {denominazione_ada, uc, capacita, conoscenze}
            }
    
    # Find row indices for different row types
    row_indices = {
        "settori": [],
        "descrizione": [],
        "denominazione_ada": [],
        "uc": [],
        "capacita": [],
        "conoscenze": [],
    }
    
    for i, row in enumerate(rows):
        if not row:
            continue
        label = row[0].strip().lower() if row[0] else ""
        
        if "settori di riferimento" in label:
            row_indices["settori"].append(i)
        elif label == "descrizione":
            row_indices["descrizione"].append(i)
        elif label == "denominazione ada":
            row_indices["denominazione_ada"].append(i)
        elif label == "uc":
            row_indices["uc"].append(i)
        elif label == "capacità" or label == "capacita":
            row_indices["capacita"].append(i)
        elif label == "conoscenze":
            row_indices["conoscenze"].append(i)
    
    # Extract settore and descrizione for each figure
    for fig_name, fig_data in figures.items():
        col_idx = fig_data["column_index"]
        
        # Get settore (use first settori row if multiple exist)
        if row_indices["settori"]:
            row_idx = row_indices["settori"][0]
            if col_idx < len(rows[row_idx]):
                fig_data["settore"] = clean_sector_name(rows[row_idx][col_idx])
        
        # Get descrizione (use first descrizione row)
        if row_indices["descrizione"]:
            row_idx = row_indices["descrizione"][0]
            if col_idx < len(rows[row_idx]):
                fig_data["descrizione"] = clean_value(rows[row_idx][col_idx])
    
    # Extract ADAs, UCs, and associated Capacità/Conoscenze
    # ADAs and UCs come in pairs - the nth ADA row corresponds to the nth UC row
    ada_rows = row_indices["denominazione_ada"]
    uc_rows = row_indices["uc"]
    capacita_rows = row_indices["capacita"]
    conoscenze_rows = row_indices["conoscenze"]
    
    # Create ranges for each ADA block to associate capacità/conoscenze
    # Structure: ADA row -> some rows -> UC row -> Capacità rows -> Conoscenze rows -> next ADA
    ada_blocks = []
    for i, ada_row_idx in enumerate(ada_rows):
        uc_row_idx = uc_rows[i] if i < len(uc_rows) else None
        next_ada_row_idx = ada_rows[i + 1] if i + 1 < len(ada_rows) else len(rows)
        
        # Find capacità and conoscenze rows that belong to this ADA block
        block_capacita = [r for r in capacita_rows if ada_row_idx < r < next_ada_row_idx]
        block_conoscenze = [r for r in conoscenze_rows if ada_row_idx < r < next_ada_row_idx]
        
        ada_blocks.append({
            "ada_row": ada_row_idx,
            "uc_row": uc_row_idx,
            "capacita_rows": block_capacita,
            "conoscenze_rows": block_conoscenze,
        })
    
    # Extract data for each figure
    for fig_name, fig_data in figures.items():
        col_idx = fig_data["column_index"]
        
        for block in ada_blocks:
            # Get ADA name
            ada_name = ""
            if block["ada_row"] is not None and col_idx < len(rows[block["ada_row"]]):
                ada_name = clean_value(rows[block["ada_row"]][col_idx])
            
            if not ada_name:
                continue  # Skip empty ADAs
            
            # Get UC
            uc = ""
            if block["uc_row"] is not None and col_idx < len(rows[block["uc_row"]]):
                uc = clean_value(rows[block["uc_row"]][col_idx])
            
            # Get Capacità
            capacita = []
            for row_idx in block["capacita_rows"]:
                if col_idx < len(rows[row_idx]):
                    val = clean_value(rows[row_idx][col_idx])
                    if val:
                        capacita.append(val)
            
            # Get Conoscenze
            conoscenze = []
            for row_idx in block["conoscenze_rows"]:
                if col_idx < len(rows[row_idx]):
                    val = clean_value(rows[row_idx][col_idx])
                    if val:
                        conoscenze.append(val)
            
            fig_data["adas"].append({
                "denominazione_ada": ada_name,
                "uc": uc,
                "capacita": capacita,
                "conoscenze": conoscenze,
            })
    
    # Collect unique sectors
    sectors = set()
    for fig_data in figures.values():
        if fig_data["settore"]:
            sectors.add(fig_data["settore"])
    
    return {"figures": figures, "sectors": sectors}


def generate_json_files(data: dict, output_dir: Path) -> None:
    """Generate the 4 JSON output files from parsed data."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    figures = data["figures"]
    sectors = data["sectors"]
    
    # 1. settori.json - List of unique sectors
    settori_list = sorted(list(sectors))
    with open(output_dir / "settori.json", "w", encoding="utf-8") as f:
        json.dump(settori_list, f, ensure_ascii=False, indent=2)
    
    # 2. figure_per_settore.json - Maps sector to figures
    figure_per_settore = defaultdict(list)
    for fig_name, fig_data in figures.items():
        settore = fig_data["settore"]
        if settore:
            figure_per_settore[settore].append({
                "denominazione_figura": fig_name,
                "descrizione": fig_data["descrizione"],
            })
    
    # Sort figures within each sector
    for settore in figure_per_settore:
        figure_per_settore[settore].sort(key=lambda x: x["denominazione_figura"])
    
    with open(output_dir / "figure_per_settore.json", "w", encoding="utf-8") as f:
        json.dump(dict(figure_per_settore), f, ensure_ascii=False, indent=2)
    
    # 3. ada_per_figura.json - Maps figure to ADAs
    ada_per_figura = {}
    for fig_name, fig_data in figures.items():
        adas = []
        for ada in fig_data["adas"]:
            if ada["denominazione_ada"]:
                adas.append({
                    "denominazione_ada": ada["denominazione_ada"],
                    "uc": ada["uc"],
                })
        if adas:
            ada_per_figura[fig_name] = adas
    
    with open(output_dir / "ada_per_figura.json", "w", encoding="utf-8") as f:
        json.dump(ada_per_figura, f, ensure_ascii=False, indent=2)
    
    # 4. dettagli_ada.json - Maps ADA to capacità and conoscenze
    dettagli_ada = {}
    for fig_data in figures.values():
        for ada in fig_data["adas"]:
            ada_name = ada["denominazione_ada"]
            if not ada_name:
                continue
            
            # If ADA already exists, merge the capacità and conoscenze
            if ada_name in dettagli_ada:
                existing_capacita = set(dettagli_ada[ada_name]["capacita"])
                existing_conoscenze = set(dettagli_ada[ada_name]["conoscenze"])
                existing_capacita.update(ada["capacita"])
                existing_conoscenze.update(ada["conoscenze"])
                dettagli_ada[ada_name]["capacita"] = sorted(list(existing_capacita))
                dettagli_ada[ada_name]["conoscenze"] = sorted(list(existing_conoscenze))
            else:
                dettagli_ada[ada_name] = {
                    "capacita": sorted(list(set(ada["capacita"]))),
                    "conoscenze": sorted(list(set(ada["conoscenze"]))),
                }
    
    with open(output_dir / "dettagli_ada.json", "w", encoding="utf-8") as f:
        json.dump(dettagli_ada, f, ensure_ascii=False, indent=2)


def main() -> None:
    """Main entry point - process all CSV files in the data directory."""
    # Get the script's directory and find the data directory
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent  # Go up one level to data/
    output_dir = data_dir / "output"
    
    # Find all CSV files in the data directory
    csv_files = list(data_dir.glob("*.csv"))
    
    if not csv_files:
        print(f"No CSV files found in {data_dir}")
        return
    
    print(f"Found {len(csv_files)} CSV file(s) to process")
    
    # Process each CSV file
    for csv_file in csv_files:
        print(f"\nProcessing: {csv_file.name}")
        
        # Create output subdirectory for this file
        file_output_dir = output_dir / csv_file.stem
        
        # Parse and generate JSON files
        data = parse_csv(csv_file)
        
        print(f"  - Found {len(data['figures'])} figures")
        print(f"  - Found {len(data['sectors'])} unique sectors")
        
        # Count total ADAs
        total_adas = sum(len(fig["adas"]) for fig in data["figures"].values())
        print(f"  - Found {total_adas} total ADA entries")
        
        generate_json_files(data, file_output_dir)
        print(f"  - Generated JSON files in: {file_output_dir}")
    
    print("\nProcessing complete!")


if __name__ == "__main__":
    main()

