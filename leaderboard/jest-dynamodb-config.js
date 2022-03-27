module.exports = {
  tables: [
    {
      TableName: `boards`,
      KeySchema: [
        { AttributeName: 'Name', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'Name', AttributeType: 'S' },
        // { AttributeName: 'Score_Range', AttributeType: 'NS' },
        // { AttributeName: 'Branching_Factor', AttributeType: 'N' },
        // { AttributeName: 'Period', AttributeType: 'S' },
        // { AttributeName: 'Leaderboard_Size', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    },
    {
      TableName: `scores`,
      KeySchema: [
        { AttributeName: 'Player_ID', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'Player_ID', AttributeType: 'S' },
        // { AttributeName: 'Score', AttributeType: 'NS' },
        // { AttributeName: 'Date', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    },
    {
      TableName: `nodes`,
      KeySchema: [
        { AttributeName: 'Node_ID', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'Node_ID', AttributeType: 'S' },
        // { AttributeName: 'Child_Counts', AttributeType: 'NS' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    },
    {
      TableName: `leaderboards`,
      KeySchema: [
        { AttributeName: 'Board_Name', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'Board_Name', AttributeType: 'S' },
        // { AttributeName: 'Period', AttributeType: 'S' },
        // { AttributeName: 'Scores', AttributeType: 'L' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    },
  ],
};