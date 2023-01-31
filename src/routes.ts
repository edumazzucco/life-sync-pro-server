import dayjs from "dayjs";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "./lib/prisma";

export async function appRoutes(app: FastifyInstance) {
  app.get("/habits", async () => {
    const habits = await prisma.habit.findMany();
    return habits;
  });

  app.post("/habits", async (request) => {
    const body = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
    });

    const { title, weekDays } = body.parse(request.body);

    const today = dayjs().startOf("day").toDate();

    const habit = await prisma.habit.create({
      data: {
        title,
        created_at: today,
        weekDays: {
          create: weekDays.map((weekDay) => ({ week_day: weekDay })),
        },
      },
    });
    return habit;
  });

  app.get("/day", async (request) => {
    const query = z.object({
      date: z.coerce.date(),
    });

    const { date } = query.parse(request.query);

    const parsedDate = dayjs(date).startOf("day");
    const weekDay = parsedDate.get("day");

    const filteredHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte: date,
        },
        weekDays: {
          some: {
            week_day: weekDay,
          },
        },
      },
    });

    const day = await prisma.day.findUnique({
      where: {
        date: parsedDate.toDate(),
      },
      include: {
        dayHabits: true,
      },
    });

    const completedHabits = day?.dayHabits.filter((dh) => dh.habit_id);

    return { filteredHabits, completedHabits };
  });
}
