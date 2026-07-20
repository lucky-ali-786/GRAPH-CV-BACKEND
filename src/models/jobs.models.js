import mongoose, { Schema } from "mongoose";
const JobSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['WAITING', 'ACTIVE', 'COMPLETED', 'FAILED'],
    default: 'WAITING'
  },
  resumeLinkUsed: {
    type: String,
    required: true
  },
  jd:{
    type:String,
  },
  result: {
    type: Schema.Types.Mixed,
    default: null
  },
  type:{
    type:String,
  }
}, { timestamps: true });

export const Job = mongoose.model('Job', JobSchema);