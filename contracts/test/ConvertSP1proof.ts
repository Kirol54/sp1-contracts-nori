#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface SP1ProofJSON {
	proof: {
		Plonk: {
			public_inputs: string[];
			encoded_proof: string;
			plonk_vkey_hash: number[];
		};
	};
	public_values: {
		buffer: {
			data: number[];
		};
	};
	sp1_version: string;
}

interface ConvertedConstants {
	programVKey: string;
	publicValues: string;
	proofValid: string;
	verifierHash: string;
	verifierSelector: string;
}

function convertSP1ProofToSolidity(jsonFilePath: string): ConvertedConstants {
	try {
		// Read and parse the JSON file
		const jsonContent = readFileSync(jsonFilePath, "utf-8");
		const proofData: SP1ProofJSON = JSON.parse(jsonContent);

		// Extract public inputs
		const publicInputs = proofData.proof.Plonk.public_inputs;
		if (publicInputs.length < 2) {
			throw new Error("Invalid proof: Expected at least 2 public inputs");
		}

		// Convert program VKey (first public input) to hex
		const programVKeyBigInt = BigInt(publicInputs[0]);
		const programVKey = "0x" + programVKeyBigInt.toString(16).padStart(64, "0");

		// Convert public values buffer to hex
		const publicValuesBuffer = proofData.public_values.buffer.data;
		const publicValues =
			"0x" +
			publicValuesBuffer.map((b) => b.toString(16).padStart(2, "0")).join("");

		// Extract verifier hash and create selector
		const vkeyHash = proofData.proof.Plonk.plonk_vkey_hash;
		const verifierHash =
			"0x" + vkeyHash.map((b) => b.toString(16).padStart(2, "0")).join("");

		// First 4 bytes as verifier selector
		const verifierSelector =
			"0x" +
			vkeyHash
				.slice(0, 4)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");

		// Create full proof with selector prefix
		const encodedProof = proofData.proof.Plonk.encoded_proof;
		const proofValid = verifierSelector.slice(2) + encodedProof; // Remove 0x from selector
		const proofValidHex = "0x" + proofValid;

		return {
			programVKey,
			publicValues,
			proofValid: proofValidHex,
			verifierHash,
			verifierSelector,
		};
	} catch (error) {
		throw new Error(`Failed to convert proof: ${error}`);
	}
}

function generateSolidityConstants(
	constants: ConvertedConstants,
	outputPath?: string
): string {
	const solidityCode = `// Auto-generated SP1 Proof Constants
// Generated from SP1 v5.0.0 JSON proof

// Program verification key from public_inputs[0]
bytes32 internal constant PROGRAM_VKEY = bytes32(${constants.programVKey});

// Public values buffer from public_values.buffer.data
bytes internal constant PUBLIC_VALUES = hex"${constants.publicValues.slice(2)}";

// Valid proof with verifier selector prefix
bytes internal constant PROOF_VALID = hex"${constants.proofValid.slice(2)}";

// Verifier hash (should match VERIFIER_HASH() in your SP1Verifier contract)
bytes32 internal constant VERIFIER_HASH = ${constants.verifierHash};

// Verifier selector (first 4 bytes of VERIFIER_HASH)
bytes4 internal constant VERIFIER_SELECTOR = ${constants.verifierSelector};
`;

	if (outputPath) {
		writeFileSync(outputPath, solidityCode);
		console.log(`✅ Solidity constants written to: ${outputPath}`);
	}

	return solidityCode;
}

function generateSolidityTest(
	constants: ConvertedConstants,
	testName = "SP1VerifierTest",
	outputPath?: string
): string {
	const testCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SP1Verifier} from "../src/v5.0.0/SP1VerifierPlonk.sol";

contract ${testName} is Test {
    // Auto-generated constants from SP1 v5.0.0 JSON proof
    
    bytes32 internal constant PROGRAM_VKEY = bytes32(${constants.programVKey});
    
    bytes internal constant PUBLIC_VALUES = hex"${constants.publicValues.slice(
			2
		)}";
    
    bytes internal constant PROOF_VALID = hex"${constants.proofValid.slice(2)}";
    
    // Keep a simple invalid proof for negative testing
    bytes internal constant PROOF_INVALID = hex"616a42052115dd50acf8e57f10c32ca72a6940";

    address internal verifier;

    function setUp() public virtual {
        verifier = address(new SP1Verifier());
    }

    /// @notice Should succeed when the proof is valid.
    function test_VerifyProof_Valid() public view {
        SP1Verifier(verifier).verifyProof(
            PROGRAM_VKEY,
            PUBLIC_VALUES,
            PROOF_VALID
        );
    }

    /// @notice Should revert when the proof is invalid.
    function test_VerifyProof_Invalid() public {
        vm.expectRevert();
        SP1Verifier(verifier).verifyProof(
            PROGRAM_VKEY,
            PUBLIC_VALUES,
            PROOF_INVALID
        );
    }

    /// @notice Should revert with wrong program key.
    function test_VerifyProof_WrongProgramKey() public {
        bytes32 wrongKey = bytes32(uint256(1));
        vm.expectRevert();
        SP1Verifier(verifier).verifyProof(
            wrongKey,
            PUBLIC_VALUES,
            PROOF_VALID
        );
    }
}
`;

	if (outputPath) {
		writeFileSync(outputPath, testCode);
		console.log(`✅ Solidity test written to: ${outputPath}`);
	}

	return testCode;
}

// CLI functionality
function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
Usage: node convert-sp1-proof.ts <json-file> [options]

Options:
  --constants-out <file>    Output Solidity constants to file
  --test-out <file>         Output complete Solidity test to file
  --test-name <name>        Name for the test contract (default: SP1VerifierTest)
  --help                    Show this help message

Examples:
  node convert-sp1-proof.ts proof.json
  node convert-sp1-proof.ts proof.json --test-out SP1Test.sol
  node convert-sp1-proof.ts proof.json --constants-out constants.sol --test-name MyTest
`);
		process.exit(0);
	}

	const jsonFile = args[0];
	let constantsOut: string | undefined;
	let testOut: string | undefined;
	let testName = "SP1VerifierTest";

	// Parse arguments
	for (let i = 1; i < args.length; i++) {
		switch (args[i]) {
			case "--constants-out":
				constantsOut = args[++i];
				break;
			case "--test-out":
				testOut = args[++i];
				break;
			case "--test-name":
				testName = args[++i];
				break;
			case "--help":
				console.log("Help shown above");
				process.exit(0);
				break;
		}
	}

	try {
		console.log(`🔄 Converting SP1 proof from: ${jsonFile}`);

		const constants = convertSP1ProofToSolidity(jsonFile);

		console.log(`
📋 Extracted Constants:
Program VKey: ${constants.programVKey}
Public Values Length: ${constants.publicValues.length - 2} hex chars (${
			(constants.publicValues.length - 2) / 2
		} bytes)
Proof Length: ${constants.proofValid.length - 2} hex chars (${
			(constants.proofValid.length - 2) / 2
		} bytes)
Verifier Hash: ${constants.verifierHash}
Verifier Selector: ${constants.verifierSelector}
`);

		if (constantsOut) {
			generateSolidityConstants(constants, constantsOut);
		}

		if (testOut) {
			generateSolidityTest(constants, testName, testOut);
		}

		if (!constantsOut && !testOut) {
			console.log("📄 Solidity Constants:");
			console.log(generateSolidityConstants(constants));
		}

		console.log("✅ Conversion completed successfully!");
	} catch (error) {
		console.error("❌ Error:", (error as Error).message);
		process.exit(1);
	}
}

// Export functions for use as a module
export {
	convertSP1ProofToSolidity,
	generateSolidityConstants,
	generateSolidityTest,
	ConvertedConstants,
	SP1ProofJSON,
};

// Run CLI if this file is executed directly
if (require.main === module) {
	main();
}
