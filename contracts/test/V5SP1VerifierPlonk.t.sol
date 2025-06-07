// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {SP1Verifier} from "../src/v5.0.0/SP1VerifierPlonk.sol";

contract SP1VerifierPlonkTest is Test {
    // Updated PROGRAM_VKEY from the JSON proof public_inputs[0]
    bytes32 internal constant PROGRAM_VKEY =
        bytes32(
            0x00265fa666dda7006a8e9cf5bcdea768ad04c422536b257fba068cb76c3109b5
        );

    // Updated PUBLIC_VALUES from the JSON proof public_values.buffer.data
    bytes internal constant PUBLIC_VALUES =
        hex"000000000043eca06168e342e2b13c9820aaaaa3b3aaa8ac17385a5f48a1e6515abc163666701d48000000000043ed20e19d420cecb3838937b1202b1a5e9c6cc1aa4260d4d3bf65809b69857cdee22c2b11584fa73e873af70136b90d6f38b13d83d0e235d4d44828b33d68e64017b50000000000000000000000000000000000000000000000000000000000000000b108583d6cdddb5e91fb0610148b063694a17d795cc613cd1348de931e09f80e";

    // Updated PROOF_VALID from the JSON proof with verifier selector prefix
    bytes internal constant PROOF_VALID =
        hex"d4e8ecd224d5c319764d788edb9f695cfcdd2df2510b0576a4bdbd79953c7f74359f0559021971912d12779f292513e2492c6d6952ee08c7646f000d2f2db051b70906081a5da859d516b01de2ea458a96d65a1cfb2072cd620a0687a5087fedaa8dcc4e23610e8a21f2f01208cca389b87bcc8281ae83f99de0a142af2537fa2e9dc7c201b299f59939ec5f2e34d221f07000c63c4fb1dd7c1514eb37a7ee8fff2a0e7f0b90f2a7fcccc16bb39f257b29734fdd67379819a70490d6dd9141321128c591047d749ab2c1271768691bc36003fa5fba054c01f22f1d1199f6498f4eaabde0166ac12b01f1843886bf3615619ae2dc32cb5605c6c6bdc8f9f56682034447031168993b6d29ce8a0518c616cef6b74bb06c08c49f4673e7e23d054d1038ff6801f2e26f59c1f15942f0dd2135d051f4846923c76c6fd7f8a4d1bdb30ce7c9b21f9a6f6a6e113512556a6927bb132ee81b9974bce81c2e453ce283e69a3fa51c17e2ededee39b57f6771a2344ad6fed54536b1c9db0ab2cd27d931feaf3d15cb160aec52026d8752906a7df6b9a62752a7e1a7adce6f63891127d7b6ef70f42028ca7e06ad1ce50da719a321e9f705c707756f04530a8ab826874170a836b628155e4f5ce938f45c2b224f5f0dbc04c5ab06f30677fff56e581cfc7432f82258139f972305ea39186d23ec0cdef2d801bac894a6b4467ab0e362213adc666f7d04430bbda57a5d36450edee4d67cf7a77f881fdbd26c565969a8bda5e2eb43c601a17a8546e13d4e6b4fa36fb0d669cb3dbc1698ba183dc55bc94ebe24379913242c895aa8146b694238eca9f90c57813f272d110a7e0d60474f2f4c7ec653a60da6c57462c77613f361d73332905b4990c9ba00aea99f0b843247a3246447b310337dbb59d57fb9695e0e78b245050d4cdcc2d05ecdd02105443f247f9625d303123e653a2d1f5dd70721ee0e34e8f4a9022b8290d1d6bbc7365c28411b9c2214222179391fc1c2fdf180416a9de2fd67859d924fb8dd6d9cde068cf1232c4e1bfceb817d186c90a9b36bf34c0782e9957b9a9dbf59ed44df06396f6155f718101c4ec07858d26a81fad52ff12503f6bda12874a01841c976e8058d9afdf3270439540991a4b516400042751fe0dfb63818c7e8614efeaae6a6a1c605f647120aef7d28f290a7a7bddb6ffc3c07ca304bc0a7893036062d12c8c37502cf4b34";

    bytes internal constant PROOF_INVALID =
        hex"616a42052115dd50acf8e57f10c32ca72a6940";

    address internal verifier;

    function setUp() public virtual {
        verifier = address(new SP1Verifier());
    }

    /// @notice Should succeed when the proof is valid.
    function test_VerifyProof_WhenPlonk() public view {
        SP1Verifier(verifier).verifyProof(
            PROGRAM_VKEY,
            PUBLIC_VALUES,
            PROOF_VALID
        );
    }

    /// @notice Should revert when the proof is invalid.
    function test_RevertVerifyProof_WhenPlonk() public {
        vm.expectRevert();
        SP1Verifier(verifier).verifyProof(
            PROGRAM_VKEY,
            PUBLIC_VALUES,
            PROOF_INVALID
        );
    }
}
