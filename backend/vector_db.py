import chromadb
from sentence_transformers import SentenceTransformer
import os

CURRENT_FILE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_FILE_DIR)
persist_directory = os.path.join(PROJECT_ROOT, "chroma_db")

class VectorDB:
    def __init__(self, persist_directory=persist_directory, embedding_model="all-MiniLM-L6-v2"):
        self.client = chromadb.PersistentClient(path=persist_directory)
        self.collection = self.client.get_or_create_collection("definitions")
        self.model = SentenceTransformer(embedding_model)

    def add_or_update(self, word, reply):
        word = word.lower()
        results = self.collection.get(where={"word": word})
        if results["ids"]:
            doc_id = results["ids"][0]
            new_reply = results["documents"][0] + "\n" + reply
            embedding = self.model.encode([word])[0].tolist()
            self.collection.update(
                ids=[doc_id],
                documents=[new_reply],
                embeddings=[embedding],
                metadatas=[{"word": word}]
            )
        else:
            embedding = self.model.encode([word])[0].tolist()
            self.collection.add(
                ids=[word],
                documents=[reply],
                embeddings=[embedding],
                metadatas=[{"word": word}]
            )

    def search(self, word, top_k=1):
        word = word.lower()
        embedding = self.model.encode([word])[0].tolist()
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=top_k
        )
        if results["documents"] and results["documents"][0]:
            return results["documents"][0][0]
        return None

    def get_recent_searches(self, limit=10):
        """Get recent searches from the vector database"""
        try:
            # Get all documents from the collection
            results = self.collection.get()
            
            if not results["ids"]:
                return []
            
            # Create a list of search history items
            history = []
            for i, doc_id in enumerate(results["ids"]):
                word = results["metadatas"][i]["word"] if results["metadatas"] else doc_id
                document = results["documents"][i] if results["documents"] else ""
                
                # Truncate the document content for display
                truncated_content = document[:200] + "..." if len(document) > 200 else document
                
                history.append({
                    "word": word,
                    "content": truncated_content,
                    "full_content": document
                })
            
            # Return the most recent items (limit the number)
            return history[-limit:] if len(history) > limit else history
            
        except Exception as e:
            print(f"Error getting recent searches: {str(e)}")
            return []

