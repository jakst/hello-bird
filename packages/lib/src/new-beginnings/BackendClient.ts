import { nanoid } from "nanoid";
import { dedupeAsync } from "./dedupeAsync";
import { EventQueue } from "./event-queue";
import { type ShoppingListEvent, type ShoppingListItem } from "./newSchemas";
import { applyEvent } from "./shopping-list";

interface BackendClientDeps {
  eventQueue: EventQueue<ShoppingListEvent[]>;
  initialList: ShoppingListItem[];
  onListChanged: (list: ShoppingListItem[]) => void;
  bot: BackendClientBot;
}

type ListItem = Pick<ShoppingListItem, "name" | "checked">;

export class BackendClient {
  onEventsReturned: null | ((events: ShoppingListEvent[]) => void) = null;
  #previousListState: ShoppingListItem[];

  constructor(private $d: BackendClientDeps) {
    this.#previousListState = $d.initialList;
  }

  async flush() {
    await this.#waitAndStart();
  }

  pushEvents(events: ShoppingListEvent[]) {
    if (events.length > 0) {
      this.$d.eventQueue.push(events);
      this.#waitAndStart();
    }
  }

  #waitAndStart() {
    return dedupeAsync(this.#startProcessor.bind(this));
  }

  async #startProcessor() {
    await this.$d.eventQueue.process(async (eventGroups) => {
      for (const events of eventGroups) {
        await this.#processEvents(events);
      }
    });

    // Process any events that arrived while running
    if (!this.$d.eventQueue.isEmpty) await this.#startProcessor();
  }

  async #processEvents(events: readonly ShoppingListEvent[]) {
    // Make a copy of the list old so we can mutate, while diffing against the old state
    const oldListState = this.#previousListState;
    const newListState = structuredClone(oldListState);

    const listBeforeChanges = await this.$d.bot.getList();

    // Generate outgoing events before we make any changes
    const eventsToReturn = generateEvents(listBeforeChanges, oldListState);
    if (eventsToReturn.length > 0) this.onEventsReturned?.(eventsToReturn);

    // Apply incoming events
    for (const event of events) {
      const eventWasAccepted = applyEvent(newListState, event);
      if (eventWasAccepted) await this.#executeEvent(event, oldListState);
    }

    this.$d.onListChanged(newListState);
    this.#previousListState = newListState;
  }

  async #executeEvent(
    event: ShoppingListEvent,
    previousListState: readonly ShoppingListItem[],
  ) {
    switch (event.name) {
      case "ADD_ITEM": {
        await this.$d.bot.ADD_ITEM(event.data.name);
        break;
      }

      case "DELETE_ITEM": {
        const item = previousListState.find(({ id }) => id === event.data.id);
        if (item) await this.$d.bot.DELETE_ITEM(item.name);
        break;
      }

      case "SET_ITEM_CHECKED": {
        const item = previousListState.find(({ id }) => id === event.data.id);
        if (item)
          await this.$d.bot.SET_ITEM_CHECKED(item.name, event.data.checked);
        break;
      }

      case "RENAME_ITEM": {
        const item = previousListState.find(({ id }) => id === event.data.id);
        if (item) await this.$d.bot.RENAME_ITEM(item.name, event.data.newName);

        break;
      }

      case "CLEAR_CHECKED_ITEMS": {
        await this.$d.bot.CLEAR_CHECKED_ITEMS();
        break;
      }
    }
  }
}

function generateEvents(
  list: readonly ListItem[],
  previousListState: readonly ShoppingListItem[],
) {
  const generatedEvents: ShoppingListEvent[] = [];

  list.forEach((newItem) => {
    const itemFromBefore = previousListState.find(
      ({ name }) => name === newItem.name,
    );

    // console.log({ itemFromBefore });

    if (!itemFromBefore) {
      const id = nanoid();
      generatedEvents.push({
        name: "ADD_ITEM",
        data: { id, name: newItem.name },
      });

      if (newItem.checked) {
        generatedEvents.push({
          name: "SET_ITEM_CHECKED",
          data: { id, checked: true },
        });
      }
    } else if (itemFromBefore.checked !== newItem.checked) {
      generatedEvents.push({
        name: "SET_ITEM_CHECKED",
        data: { id: itemFromBefore.id, checked: newItem.checked },
      });
    }
  });

  previousListState.forEach((olditem) => {
    const currentItem = list.find(({ name }) => name === olditem.name);
    if (!currentItem)
      generatedEvents.push({ name: "DELETE_ITEM", data: { id: olditem.id } });
  });

  return generatedEvents;
}

export interface BackendClientBot {
  getList(): Promise<ListItem[]>;
  ADD_ITEM(name: string): Promise<void>;
  DELETE_ITEM(name: string): Promise<void>;
  RENAME_ITEM(oldName: string, newName: string): Promise<void>;
  SET_ITEM_CHECKED(name: string, checked: boolean): Promise<void>;
  CLEAR_CHECKED_ITEMS(): Promise<void>;
}