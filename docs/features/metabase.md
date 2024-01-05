# 目的
`Metabase`を用いて`LibreChat`内の`MongoDB`を参照し、利用状況の分析を可能とする。

**Metabase**  
https://www.metabase.com

また、MongoDBに対する複雑なクエリー文を作成するためには、MetabaseのUIだけでは作成が困難であり、`MongoDB Compass`を別途作業端末にインストールし、クエリー文作成の補助とする必要あり。

***MongoDB Compass***  
https://www.mongodb.com/products/tools/compass

# MongoDB Compass
MongoDB Compassからクエリー作成をするための一連の手順。クエリー作成が不要の場合は以下作業も不要。

## MongoDBポート開放
*注意! 認証なしでアクセスできてしまうため、常時開放はしないこと。MongoDB Compassからアクセスするときだけ、一時的に開けること。*

`docker-compose.yml`で以下のように設定。

```yml
  mongodb:
    ...
    networks:
      ...
      - bridge_network
    ports:
      - 27018:27017
```

`mongodb`サービスの再起動。

## MongoDB Compassからの接続
- New connection
- URI: mongodb://hostname:27018/

## クエリー作成
- `LibreChat`データベースを選択
- 例えば`conversations`コレクションを選択
- `Aggragations`タブを選択
- Stage形式、もしくはText形式でクエリー作成

もっぱらStage形式で作ることになると想定。MongoDB Compass上ではコメントが許されるが、Metabase上ではコメントが入っているとエラーになるので、コメントは削除すること。

## クエリー例
SQLとは全く異なる文法になる。ただし分析のために利用するロジックはlookupなど限られていると思われる。以下に例を示す。以下を参考にして各種クエリー作成ができるはず。

### 日付毎のメッセージ数

元コレクション: messages
```json
[
  {
    $addFields: {
      createdAtDate: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt",
        },
      },
    },
  },
  {
    $group: {
      _id: {
        createdAtDate: "$createdAtDate",
      },
      count: {
        $sum: 1,
      },
    },
  },
  {
    $sort: {
      _id: 1,
    },
  },
  {
    $project: {
      _id: false,
      date: "$_id.createdAtDate",
      count: "$count",
    },
  },
]
```

### ユーザ毎のメッセージ数
（email, name, firstUseDate, lastUseDate, Count）

元コレクション: messages
```json
[
  {
    $addFields: {
      userId: {
        $toObjectId: "$user",
      },
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userInfo",
    },
  },
  {
    $unwind: {
      path: "$userInfo",
    },
  },
  {
    $group: {
      _id: {
        email: "$userInfo.email",
        name: "$userInfo.name",
      },
      count: {
        $sum: 1,
      },
      firstUseDate: {
        $min: "$createdAt",
      },
      lastUseDate: {
        $max: "$createdAt",
      },
    },
  },
  {
    $sort: {
      count: -1,
    },
  },
  {
    $project: {
      _id: false,
      email: "$_id.email",
      name: "$_id.name",
      firstUseDate: "$firstUseDate",
      lastUseDate: "$lastUseDate",
      count: "$count",
    },
  },
]
```


# Metabase
## 初回設定
http://hostname:3001/

MongoDB Compassからは`27018`で接続するが、Metabaseからは同じDocker Network内からのアクセスのため`27017`で接続することに注意。

- 開始しましょう
- English
- Account
  - 何かオンラインで登録されるわけではないので、Email含め適当で構わない。
  - First Name: Daisuke
  - Last Name: Nakata
  - Email: test@test.com
  - Company: test
  - Password: testtest1
- Add your data
  - Type: mongodb
  - Display Name: LibreChat
  - Host: mongodb
  - Database name: LibreChat
  - Port: 27017
  - Username: (null)
  - Password: (null)
  - Connect database
- Usage data preferences
  - Collect usage events: false
- Finish
- Metabase Newletter: (delete email)
- Take me to Metabase