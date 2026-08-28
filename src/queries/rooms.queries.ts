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

export const addUserToRoom = async (userId: number, roomId: number) => {
  await pool.query(
    `
    INSERT INTO room_members (room_id, user_id, role)
    VALUES ($1, $2, 'MEMBER')
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
