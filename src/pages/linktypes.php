<?php
session_start();

// load the JSON-LD version of the current GS1 web vocabulary file
// $vocabdata=file_get_contents('./gs1Voc.jsonld');

$vocabdata=file_get_contents('https://ref.gs1.org/voc/data/gs1Voc.jsonld');

// $uiLanguage is set to "en" but anticipates that in future the GS1 Web Vocabulary may also contain localised rdfs:label and rdfs:comment in other languages.
// so for example if German language labels and comments for all terms were available, GS1 Germany could set $uiLanguage="de" for the localised version of this tool hosted on their website.
// for the time being, $uiLanguage should continue to have the value "en".
$uiLanguage="en";

// load the English language version of the lookups for all fixed text for this tool
include "uiText_en.php";

$defaultLang="en";
$prefLang=$_GET['lang'];
if (($prefLang  == null ) || ($prefLang  == "")) {
	$prefLang="en";
}

$obj = json_decode($vocabdata,true);
$g=$obj["@graph"];

$properties=[];
$linktypes=[];
$linktype=[];
$property=[];

function selectLanguage($obj,$langPref,$defaultLang) {
	$r="";
	if (array_key_exists("@language",$obj)) {
		if ($obj["@language"] == $defaultLang) { $r = $obj["@value"]; }
		if ($obj["@language"] == $langPref) { $r = $obj["@value"]; }
	} else {	
		foreach ($obj as $v) {
			if ($v["@language"] == $defaultLang) { $r = $v["@value"]; }
			if ($v["@language"] == $langPref) { $r = $v["@value"]; }
		}
	}
	return $r;
}


foreach ($g as $value) {
	$isProperty=false;
	$isClass=false;
	$isLinkType=false;
	$id=$value["@id"];
	$t=$value["@type"];
	$sup=$value["rdfs:subClassOf"];
	$ra=$value["rdfs:range"];
	$do=$value["rdfs:domain"];
	$status[$id]=$value["http://www.w3.org/2003/06/sw-vocab-status/ns#term_status"];
	$subprop=$value["rdfs:subPropertyOf"];




	if (is_array($t)) {
		foreach ($t as $v) {
			if (($v == "owl:Class") || ($v == "rdfs:Class") ) {
				$isClass=true; 
			}
			if (($v == "rdf:Property") || ($v == "owl:DatatypeProperty") || ($v == "owl:ObjectProperty") ) {
				$isProperty=true; 
			}
		}
	} else {
			if (($t == "owl:Class") || ($t == "rdfs:Class") ) {
				$isClass=true; 
			}
			if (($t == "rdf:Property") || ($t == "owl:DatatypeProperty") || ($t == "owl:ObjectProperty") ) {
				$isProperty=true; 
			}
	}

	// check if subprop is not undefined
	if (isset($subprop)) {
		if (  ($subprop["@id"] == "gs1:linkType") || ($subprop["@id"] == "gs1:gtinLinkType") ) {
			$isLinkType=true;
		}
	}


	if ($isLinkType) {
		array_push($linktypes,$id);
		$linktype[$id]=$value;
	}	
	
	
	if ($isTypeCode) { $types[$id]="TypeCode"; array_push($typecodes,$id); $typecode[$id]=$value;}

}

$jsondata=[];
foreach ($linktype as $val) {
$jsonvalue=[];
$jsonvalue["title"]=selectLanguage($val["rdfs:label"],$prefLang,$defaultLang);
$jsonvalue["description"]=selectLanguage($val["rdfs:comment"],$prefLang,$defaultLang);
if ($val["gs1:validatedHealthcareOnly"] == "true") {
$jsonvalue["validatedHealthcareOnly"]=true;
}
$jsonkey=substr($val["@id"],4);
$jsondata[$jsonkey]=$jsonvalue;
}
header('Content-Type: application/json');
echo json_encode($jsondata);
?>
