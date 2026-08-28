import { pool } from "../db/db.js";

export const fetchroomsquery = `SELECT
    r.id,
    r.name,
    r.created_at,

    CASE
        WHEN lm.id IS NULL THEN NULL
        ELSE json_build_object(
            'id', lm.id,
            'content', lm.content,
            'createdAt', lm.created_at,
            'sender', json_build_object(
                'id', u.id,
                'name', u.name,
                'username', u.user_name
            )
        )
    END AS last_message

FROM rooms r

JOIN room_members rm
    ON r.id = rm.room_id

LEFT JOIN LATERAL (
    SELECT
        m.id,
        m.content,
        m.created_at,
        m.sender_id
    FROM messages m
    WHERE m.room_id = r.id
    ORDER BY m.created_at DESC
    LIMIT 1
) lm ON true

LEFT JOIN users u
    ON u.id = lm.sender_id

WHERE rm.user_id = $1
ORDER BY lm.created_at DESC NULLS LAST;`;

const singleRoomForUserQuery = `SELECT
    r.id,
    r.name,
    r.created_at,

    CASE
        WHEN lm.id IS NULL THEN NULL
        ELSE json_build_object(
            'id', lm.id,
            'content', lm.content,
            'createdAt', lm.created_at,
            'sender', json_build_object(
                'id', u.id,
                'name', u.name,
                'username', u.user_name
            )
        )
    END AS last_message

FROM rooms r

JOIN room_members rm
    ON r.id = rm.room_id

LEFT JOIN LATERAL (
    SELECT
        m.id,
        m.content,
        m.created_at,
        m.sender_id
    FROM messages m
    WHERE m.room_id = r.id
    ORDER BY m.created_at DESC
    LIMIT 1
) lm ON true

LEFT JOIN users u
    ON u.id = lm.sender_id

WHERE rm.user_id = $1 AND r.id = $2
LIMIT 1;`;

export const getRooms = async (userId: number) => {
  const result = await pool.query(
    `SELECT r.*
     FROM rooms r
     JOIN room_members rm
       ON r.id = rm.room_id
     WHERE rm.user_id = $1`,
    [userId],
  );
  return result.rows;
};

export const getRoomsWithLastMessage = async (userId: number) => {
  const result = await pool.query(fetchroomsquery, [userId]);
  return result.rows;
};

export const getRoomForUser = async (userId: number, roomId: number) => {
  const result = await pool.query(singleRoomForUserQuery, [userId, roomId]);
  return result.rows[0] ?? null;
};

export const createRoomForUser = async (userId: number, name: string) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roomResult = await client.query(
      `
      INSERT INTO rooms (name, created_by)
      VALUES ($1, $2)
      RETURNING id
      `,
      [name, userId],
    );

    const roomId = roomResult.rows[0].id as number;

    await client.query(
      `
      INSERT INTO room_members (room_id, user_id, role)
      VALUES ($1, $2, 'admin')
      `,
      [roomId, userId],
    );

    await client.query("COMMIT");

    return roomId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const addUserToRoom = async (userId: number, roomId: number) => {
  await pool.query(
    `
    INSERT INTO room_members (room_id, user_id, role)
    VALUES ($1, $2, 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING
    `,
    [roomId, userId],
  );
};

export const removeUserFromRoom = async (userId: number, roomId: number) => {
  await pool.query(
    `
    DELETE FROM room_members
    WHERE room_id = $1 AND user_id = $2
    `,
    [roomId, userId],
  );
};

export const getMessagesForRoom = async (roomId: number) => {
  const result = await pool.query(
    `
    SELECT
      m.id,
      m.room_id AS "roomId",
      m.content,
      m.created_at AS "createdAt",
      json_build_object(
        'id', u.id,
        'name', u.name,
        'username', u.user_name
      ) AS sender
    FROM messages m
    JOIN users u
      ON u.id = m.sender_id
    WHERE m.room_id = $1
    ORDER BY m.created_at ASC, m.id ASC
    `,
    [roomId],
  );

  return result.rows;
};

export const createMessageInRoom = async (
  roomId: number,
  senderId: number,
  content: string,
) => {
  const result = await pool.query(
    `
    WITH inserted_message AS (
      INSERT INTO messages (room_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, room_id, content, created_at, sender_id
    )
    SELECT
      m.id,
      m.room_id AS "roomId",
      m.content,
      m.created_at AS "createdAt",
      json_build_object(
        'id', u.id,
        'name', u.name,
        'username', u.user_name
      ) AS sender
    FROM inserted_message m
    JOIN users u
      ON u.id = m.sender_id
    `,
    [roomId, senderId, content],
  );

  return result.rows[0];
};

export const getMessageById = async (messageId: number) => {
  const result = await pool.query(
    `
    SELECT id, room_id, sender_id
    FROM messages
    WHERE id = $1
    `,
    [messageId],
  );

  return result.rows[0] ?? null;
};

export const updateMessageInRoom = async (
  messageId: number,
  senderId: number,
  content: string,
) => {
  const result = await pool.query(
    `
    WITH updated_message AS (
      UPDATE messages
      SET content = $3
      WHERE id = $1 AND sender_id = $2
      RETURNING id, room_id, content, created_at, sender_id
    )
    SELECT
      m.id,
      m.room_id AS "roomId",
      m.content,
      m.created_at AS "createdAt",
      json_build_object(
        'id', u.id,
        'name', u.name,
        'username', u.user_name
      ) AS sender
    FROM updated_message m
    JOIN users u
      ON u.id = m.sender_id
    `,
    [messageId, senderId, content],
  );

  return result.rows[0] ?? null;
};

export const deleteMessageFromRoom = async (
  messageId: number,
  senderId: number,
) => {
  const result = await pool.query(
    `
    DELETE FROM messages
    WHERE id = $1 AND sender_id = $2
    RETURNING id, room_id AS "roomId"
    `,
    [messageId, senderId],
  );

  return result.rows[0] ?? null;
};
