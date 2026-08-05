# WebOntology

Repository for ontologies and vocabularies managed by GS1 Switzerland to maintain them and make them available to our community.
It provides free, ready-to-use "vocabularies" and "ontologies" that make data interoperable. 

# About us

GS1 Switzerland is a non‑profit, industry‑driven standardization organization and part of the global GS1 network. We support companies in enabling interoperable, efficient and transparent value chains across all sectors including retail, healthcare, logistics and industry. Our activities cover identification, data exchange, process standards and applied education.

GS1 Switzerland operates several solutions and platforms that support businesses in applying standards and improving data quality, collaboration and operational excellence. These include services in education, data management, product transparency, sector initiatives and digital solutions.

To learn more, visit [www.gs1.ch](https://www.gs1.ch)


## Difference between ontology and vocabulary

The primary difference is that a vocabulary is a restricted list of terms and definitions for a domain, whereas an ontology adds formal, machine-readable structure, rules, and complex relationships (axioms) between those concepts. Think of a vocabulary as a dictionary of words and an ontology as a structured map explaining how those words behave and relate.


## Project Structure

This repository uses a source/build structure to separate development files from production-ready artifacts.

*   `src/`: This directory contains all the **source files** for the ontology, contexts, validation shapes, and examples. **All edits and contributions should be made here.** These files may contain comments for clarity.
*   `src/sectors`:  This directory contains all the Sector and Domain related data.
*   `src/shared`:  This directory contains all the ontologies shared over multiple Sectors and Domains, like the Discovery Service related terms.
*   `testing/`: Contains the validation and integration test suite.
*   `scripts/`: Contains the build and clean scripts.


## Sectors and Domains

We distinguish between sectors and domains.
For the sectors, we use the 4-letter abbreviations defined in [Sectors - Base classification for Ontologies](https://gs1-ch.atlassian.net/wiki/x/N4AVag), based on the ISIC Revision 4 (2008) broad structure. 
For the domains, we use specific terms such as "rail" or "bearing".

The list of sectors is now loaded by the gs1-ontology-explorer at runtime from registry/sectors.jsonld in this repository.
