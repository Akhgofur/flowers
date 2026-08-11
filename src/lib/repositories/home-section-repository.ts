import "server-only";
import type { Types } from "mongoose";
import type { AdminHomeSection } from "@/lib/contracts";
import { AdminNotFoundError } from "@/lib/admin-api";
import { dbConnect } from "@/lib/mongodb";
import type {
  HomeSectionInput,
  HomeSectionPatchInput,
} from "@/lib/validations";
import {
  HomeSectionModel,
  type HomeSectionDocument,
} from "@/models/HomeSection";
import { ProductModel } from "@/models/Product";

type HomeSectionRecord = HomeSectionDocument & { _id: Types.ObjectId };

function toAdminHomeSection(document: HomeSectionRecord): AdminHomeSection {
  return {
    id: document._id.toString(),
    translations: {
      ru: { ...document.translations.ru },
      uz: { ...document.translations.uz },
      en: { ...document.translations.en },
    },
    productIds: document.productIds.map((id) => id.toString()),
    sortOrder: document.sortOrder,
    status: document.status,
    ...(document.startsAt === undefined
      ? {}
      : { startsAt: document.startsAt.toISOString() }),
    ...(document.endsAt === undefined
      ? {}
      : { endsAt: document.endsAt.toISOString() }),
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function findAllHomeSections(): Promise<AdminHomeSection[]> {
  await dbConnect();
  const documents = (await HomeSectionModel.find({})
    .sort({ sortOrder: 1, _id: 1 })
    .lean()
    .exec()) as unknown as HomeSectionRecord[];
  return documents.map(toAdminHomeSection);
}

export async function findPublishedHomeSections(): Promise<AdminHomeSection[]> {
  await dbConnect();
  const documents = (await HomeSectionModel.find({ status: "published" })
    .sort({ sortOrder: 1, _id: 1 })
    .lean()
    .exec()) as unknown as HomeSectionRecord[];
  return documents.map(toAdminHomeSection);
}

export async function countExistingHomeSectionProducts(
  productIds: readonly string[]
): Promise<number> {
  await dbConnect();
  return ProductModel.countDocuments({ _id: { $in: productIds } }).exec();
}

export async function createHomeSection(
  input: HomeSectionInput
): Promise<AdminHomeSection> {
  await dbConnect();
  const document = (await HomeSectionModel.create(input)) as unknown as HomeSectionRecord;
  return toAdminHomeSection(document);
}

export async function updateHomeSection(
  id: string,
  patch: HomeSectionPatchInput
): Promise<AdminHomeSection> {
  await dbConnect();
  const document = await HomeSectionModel.findById(id).exec();
  if (!document) throw new AdminNotFoundError("Bosh sahifa bo'limi topilmadi.");

  if (patch.translations !== undefined) document.translations = patch.translations;
  if (patch.productIds !== undefined) {
    document.productIds = patch.productIds as unknown as Types.ObjectId[];
  }
  if (patch.sortOrder !== undefined) document.sortOrder = patch.sortOrder;
  if (patch.status !== undefined) document.status = patch.status;
  if (patch.startsAt === null) document.startsAt = undefined;
  else if (patch.startsAt !== undefined) document.startsAt = new Date(patch.startsAt);
  if (patch.endsAt === null) document.endsAt = undefined;
  else if (patch.endsAt !== undefined) document.endsAt = new Date(patch.endsAt);

  await document.save();
  return toAdminHomeSection(document as unknown as HomeSectionRecord);
}

export async function deleteHomeSection(id: string): Promise<void> {
  await dbConnect();
  const result = await HomeSectionModel.deleteOne({ _id: id }).exec();
  if (result.deletedCount === 0) {
    throw new AdminNotFoundError("Bosh sahifa bo'limi topilmadi.");
  }
}
