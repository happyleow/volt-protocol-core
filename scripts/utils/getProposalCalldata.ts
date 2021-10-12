import constructProposal from './constructProposal';
import hre, { web3, ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import { BigNumber } from 'ethers';
import { AbiCoder, FunctionFragment, Interface } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import { utils } from 'ethers';

dotenv.config();

type ExtendedAlphaProposal = {
  targets: string[];
  values: BigNumber[];
  signatures: string[];
  calldatas: string[];
  description: string;
};

/**
 * Take in a hardhat proposal object and output the proposal calldatas
 * See `proposals/utils/getProposalCalldata.js` on how to construct the proposal calldata
 */
async function getProposalCalldata() {
  const proposalName = process.env.DEPLOY_FILE;

  if (!proposalName) {
    throw new Error('DEPLOY_FILE env variable not set');
  }

  const proposal = (await constructProposal(proposalName)) as ExtendedAlphaProposal;

  const governorAlphaArtifact = await hre.artifacts.readArtifactSync('GovernorAlpha');
  const governorAlphaInterface = new Interface(governorAlphaArtifact.abi);

  /*
  const calldata = governorAlphaInterface.encodeFunctionData('propose', [
    proposal.targets,
    proposal.values,
    proposal.signatures,
    proposal.calldatas,
    proposal.description
  ]);
  */
  const governorChadABI = [
    {
      inputs: [
        { internalType: 'contract ERC20VotesComp', name: 'tribe', type: 'address' },
        { internalType: 'contract ICompoundTimelock', name: 'timelock', type: 'address' },
        { internalType: 'address', name: 'guardian', type: 'address' }
      ],
      stateMutability: 'nonpayable',
      type: 'constructor'
    },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'ProposalCanceled',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { indexed: false, internalType: 'address', name: 'proposer', type: 'address' },
        { indexed: false, internalType: 'address[]', name: 'targets', type: 'address[]' },
        { indexed: false, internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
        { indexed: false, internalType: 'string[]', name: 'signatures', type: 'string[]' },
        { indexed: false, internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
        { indexed: false, internalType: 'uint256', name: 'startBlock', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'endBlock', type: 'uint256' },
        { indexed: false, internalType: 'string', name: 'description', type: 'string' }
      ],
      name: 'ProposalCreated',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'ProposalExecuted',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'eta', type: 'uint256' }
      ],
      name: 'ProposalQueued',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: 'uint256', name: 'oldProposalThreshold', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'newProposalThreshold', type: 'uint256' }
      ],
      name: 'ProposalThresholdUpdated',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: 'uint256', name: 'oldQuorum', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'newQuorum', type: 'uint256' }
      ],
      name: 'QuorumUpdated',
      type: 'event'
    },
    { anonymous: false, inputs: [], name: 'Rollback', type: 'event' },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: 'uint256', name: 'eta', type: 'uint256' }],
      name: 'RollbackQueued',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: 'address', name: 'oldTimelock', type: 'address' },
        { indexed: false, internalType: 'address', name: 'newTimelock', type: 'address' }
      ],
      name: 'TimelockChange',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { indexed: false, internalType: 'uint8', name: 'support', type: 'uint8' },
        { indexed: false, internalType: 'uint256', name: 'weight', type: 'uint256' },
        { indexed: false, internalType: 'string', name: 'reason', type: 'string' }
      ],
      name: 'VoteCast',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: 'uint256', name: 'oldVotingDelay', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'newVotingDelay', type: 'uint256' }
      ],
      name: 'VotingDelayUpdated',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: 'uint256', name: 'oldVotingPeriod', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'newVotingPeriod', type: 'uint256' }
      ],
      name: 'VotingPeriodUpdated',
      type: 'event'
    },
    {
      inputs: [],
      name: 'BACKUP_GOVERNOR',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'BALLOT_TYPEHASH',
      outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'COUNTING_MODE',
      outputs: [{ internalType: 'string', name: '', type: 'string' }],
      stateMutability: 'pure',
      type: 'function'
    },
    {
      inputs: [],
      name: 'ROLLBACK_DEADLINE',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    { inputs: [], name: '__acceptAdmin', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    { inputs: [], name: '__executeRollback', outputs: [], stateMutability: 'nonpayable', type: 'function' },
    {
      inputs: [{ internalType: 'uint256', name: 'eta', type: 'uint256' }],
      name: '__rollback',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'cancel',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { internalType: 'uint8', name: 'support', type: 'uint8' }
      ],
      name: 'castVote',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { internalType: 'uint8', name: 'support', type: 'uint8' },
        { internalType: 'uint8', name: 'v', type: 'uint8' },
        { internalType: 'bytes32', name: 'r', type: 'bytes32' },
        { internalType: 'bytes32', name: 's', type: 'bytes32' }
      ],
      name: 'castVoteBySig',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { internalType: 'uint8', name: 'support', type: 'uint8' },
        { internalType: 'string', name: 'reason', type: 'string' }
      ],
      name: 'castVoteWithReason',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'address[]', name: 'targets', type: 'address[]' },
        { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
        { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
        { internalType: 'bytes32', name: 'descriptionHash', type: 'bytes32' }
      ],
      name: 'execute',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'payable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'execute',
      outputs: [],
      stateMutability: 'payable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'getActions',
      outputs: [
        { internalType: 'address[]', name: 'targets', type: 'address[]' },
        { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
        { internalType: 'string[]', name: 'signatures', type: 'string[]' },
        { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' }
      ],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { internalType: 'address', name: 'voter', type: 'address' }
      ],
      name: 'getReceipt',
      outputs: [
        {
          components: [
            { internalType: 'bool', name: 'hasVoted', type: 'bool' },
            { internalType: 'uint8', name: 'support', type: 'uint8' },
            { internalType: 'uint96', name: 'votes', type: 'uint96' }
          ],
          internalType: 'struct IGovernorCompatibilityBravo.Receipt',
          name: '',
          type: 'tuple'
        }
      ],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'address', name: 'account', type: 'address' },
        { internalType: 'uint256', name: 'blockNumber', type: 'uint256' }
      ],
      name: 'getVotes',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
        { internalType: 'address', name: 'account', type: 'address' }
      ],
      name: 'hasVoted',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'address[]', name: 'targets', type: 'address[]' },
        { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
        { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
        { internalType: 'bytes32', name: 'descriptionHash', type: 'bytes32' }
      ],
      name: 'hashProposal',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'pure',
      type: 'function'
    },
    {
      inputs: [],
      name: 'name',
      outputs: [{ internalType: 'string', name: '', type: 'string' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'proposalDeadline',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'proposalEta',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'proposalSnapshot',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'proposalThreshold',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'proposals',
      outputs: [
        { internalType: 'uint256', name: 'id', type: 'uint256' },
        { internalType: 'address', name: 'proposer', type: 'address' },
        { internalType: 'uint256', name: 'eta', type: 'uint256' },
        { internalType: 'uint256', name: 'startBlock', type: 'uint256' },
        { internalType: 'uint256', name: 'endBlock', type: 'uint256' },
        { internalType: 'uint256', name: 'forVotes', type: 'uint256' },
        { internalType: 'uint256', name: 'againstVotes', type: 'uint256' },
        { internalType: 'uint256', name: 'abstainVotes', type: 'uint256' },
        { internalType: 'bool', name: 'canceled', type: 'bool' },
        { internalType: 'bool', name: 'executed', type: 'bool' }
      ],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'address[]', name: 'targets', type: 'address[]' },
        { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
        { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
        { internalType: 'string', name: 'description', type: 'string' }
      ],
      name: 'propose',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'address[]', name: 'targets', type: 'address[]' },
        { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
        { internalType: 'string[]', name: 'signatures', type: 'string[]' },
        { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
        { internalType: 'string', name: 'description', type: 'string' }
      ],
      name: 'propose',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [
        { internalType: 'address[]', name: 'targets', type: 'address[]' },
        { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
        { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
        { internalType: 'bytes32', name: 'descriptionHash', type: 'bytes32' }
      ],
      name: 'queue',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'queue',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'quorum',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'quorumVotes',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'newProposalThreshold', type: 'uint256' }],
      name: 'setProposalThreshold',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'newQuorum', type: 'uint256' }],
      name: 'setQuorum',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'newVotingDelay', type: 'uint256' }],
      name: 'setVotingDelay',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'newVotingPeriod', type: 'uint256' }],
      name: 'setVotingPeriod',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
      name: 'state',
      outputs: [{ internalType: 'enum IGovernor.ProposalState', name: '', type: 'uint8' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
      name: 'supportsInterface',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'timelock',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'token',
      outputs: [{ internalType: 'contract ERC20VotesComp', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [{ internalType: 'contract ICompoundTimelock', name: 'newTimelock', type: 'address' }],
      name: 'updateTimelock',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      inputs: [],
      name: 'version',
      outputs: [{ internalType: 'string', name: '', type: 'string' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'votingDelay',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'votingPeriod',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    }
  ];

  const proposeFuncFrag = new Interface([
    'function propose(address[] memory targets,uint256[] memory values,bytes[] memory calldatas,string memory description) public returns (uint256)'
  ]);

  const combinedCalldatas = [];
  for (let i = 0; i < proposal.targets.length; i++) {
    const sighash = utils.id(proposal.signatures[i]).slice(0, 10);
    combinedCalldatas.push(`${sighash}${proposal.calldatas[i].slice(2)}`);
  }

  console.log(combinedCalldatas);

  const calldata = proposeFuncFrag.encodeFunctionData('propose', [
    proposal.targets,
    proposal.values,
    combinedCalldatas,
    proposal.description
  ]);

  console.log(calldata);
}

getProposalCalldata()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });